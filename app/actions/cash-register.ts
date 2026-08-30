// @ts-nocheck
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCurrentShiftSummary(registerId: string) {
  const supabase = await createClient()

  // 1. Get the register to know when it was opened
  const { data: register, error: regError } = await supabase
    .from('cash_registers')
    .select('status, opened_at, initial_amount')
    .eq('id', registerId)
    .single()

  if (regError || !register) return { error: 'Caja no encontrada' }
  if (register.status !== 'open' || !register.opened_at) {
    return { error: 'La caja no está abierta', data: null }
  }

  // 2. Get all sales created since opened_at for this register
  // We need to join with payments to get the breakdown
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select(`
      id,
      total,
      payments (
        method,
        amount
      )
    `)
    .eq('register_id', registerId)
    .gte('created_at', register.opened_at)
    .neq('status', 'cancelled')

  if (salesError) return { error: 'Error al obtener ventas del turno' }

  // 3. Calculate totals
  let totalSalesCount = sales ? sales.length : 0
  let totalSalesAmount = 0
  let totalCash = 0
  let totalCard = 0
  let totalTransfer = 0
  let totalMobile = 0
  let totalOther = 0

  if (sales) {
    for (const sale of sales) {
      totalSalesAmount += Number(sale.total) || 0
      
      const payments = sale.payments || []
      for (const p of payments as any[]) {
        const amt = Number(p.amount) || 0
        if (p.method === 'cash') totalCash += amt
        else if (p.method === 'card') totalCard += amt
        else if (p.method === 'transfer') totalTransfer += amt
        else if (p.method === 'mobile_payment') totalMobile += amt
        else totalOther += amt
      }
    }
  }

  // We should also consider cash_movements that are not sales? (e.g. expenses, incomes)
  // For simplicity, expected_cash = initial_amount + totalCash (from sales) + (other cash incomes) - (cash expenses).
  // Let's get cash movements for this shift
  const { data: movements } = await supabase
    .from('cash_movements')
    .select('type, amount')
    .eq('register_id', registerId)
    .gte('created_at', register.opened_at)

  let otherIncomes = 0
  let otherExpenses = 0
  let cashAdjustments = 0

  if (movements) {
    for (const m of movements) {
      const amt = Number(m.amount) || 0
      if (m.type === 'income') otherIncomes += amt
      else if (m.type === 'expense') otherExpenses += amt
      else if (m.type === 'adjustment') cashAdjustments += amt
      // type 'sale' is already captured in our payments loop, but wait!
      // cash_movements captures it too. But we use payments for exact method breakdown.
    }
  }

  const initialAmount = Number(register.initial_amount) || 0
  // expected_cash = initial + cash sales + incomes - expenses + adjustments
  const expectedCash = initialAmount + totalCash + otherIncomes - otherExpenses + cashAdjustments

  return {
    success: true,
    data: {
      initialAmount,
      totalSalesCount,
      totalSalesAmount,
      totalCash,
      totalCard,
      totalTransfer,
      totalMobile,
      totalOther,
      otherIncomes,
      otherExpenses,
      cashAdjustments,
      expectedCash
    }
  }
}

export async function openRegister(registerId: string, initialAmount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Check if any register is already open for this user? Optional, but good practice.
  // The schema allows a user to open multiple, so we'll just check this one.
  const { data: register } = await supabase.from('cash_registers').select('status').eq('id', registerId).single()
  if (register?.status === 'open') return { error: 'La caja ya está abierta' }

  const { error } = await supabase
    .from('cash_registers')
    .update({
      status: 'open',
      opened_by: user.id,
      opened_at: new Date().toISOString(),
      initial_amount: initialAmount,
      // Reset previous closure data
      closed_by: null,
      closed_at: null,
      expected_cash: null,
      counted_cash: null,
      difference: null,
      notes: null
    } as any)
    .eq('id', registerId)

  if (error) return { error: 'Error al abrir la caja' }
  revalidatePath('/caja')
  return { success: true }
}

export async function closeRegister(registerId: string, countedCash: number, expectedCash: number, notes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // 1. Get shift summary to save it in history
  const summaryRes = await getCurrentShiftSummary(registerId)
  if (summaryRes.error || !summaryRes.data) {
    return { error: summaryRes.error || 'No se pudo obtener el resumen del turno' }
  }

  const { data: register } = await supabase
    .from('cash_registers')
    .select('opened_at, opened_by, initial_amount')
    .eq('id', registerId)
    .single()

  if (!register) return { error: 'Caja no encontrada' }

  const difference = countedCash - expectedCash
  const closedAt = new Date().toISOString()

  // 2. Create history record
  const { error: historyError } = await supabase
    .from('cash_register_sessions')
    .insert({
      register_id: registerId,
      opened_by: register.opened_by,
      opened_at: register.opened_at,
      initial_amount: register.initial_amount,
      closed_by: user.id,
      closed_at: closedAt,
      expected_cash: expectedCash,
      counted_cash: countedCash,
      difference: difference,
      total_sales_count: summaryRes.data.totalSalesCount,
      total_sales_amount: summaryRes.data.totalSalesAmount,
      total_cash: summaryRes.data.totalCash,
      total_card: summaryRes.data.totalCard,
      total_transfer: summaryRes.data.totalTransfer,
      total_mobile: summaryRes.data.totalMobile,
      total_other: summaryRes.data.totalOther,
      notes: notes || null
    })

  if (historyError) {
    console.error("Error creating session history:", historyError)
    // We can proceed even if history fails, or block it. It's better to log it for now.
    // If table doesn't exist, this will fail. We need the user to run the migration.
    return { error: 'Error al guardar el historial (¿Aplicaste la migración SQL?)' }
  }

  // 3. Update register status
  const { error } = await supabase
    .from('cash_registers')
    .update({
      status: 'closed',
      closed_by: user.id,
      closed_at: closedAt,
      expected_cash: expectedCash,
      counted_cash: countedCash,
      difference: difference,
      notes: notes || null
    } as any)
    .eq('id', registerId)

  if (error) return { error: 'Error al cerrar la caja' }
  revalidatePath('/caja')
  return { success: true }
}
