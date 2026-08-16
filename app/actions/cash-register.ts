// @ts-nocheck
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function openRegister(registerId: string, initialAmount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('cash_registers')
    .update({
      status: 'open',
      opened_by: user.id,
      opened_at: new Date().toISOString(),
      initial_amount: initialAmount
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

  const difference = countedCash - expectedCash

  const { error } = await supabase
    .from('cash_registers')
    .update({
      status: 'closed',
      closed_by: user.id,
      closed_at: new Date().toISOString(),
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
