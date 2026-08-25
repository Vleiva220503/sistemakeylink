'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { SaleItemInput, PaymentInput, DiscountType } from '@/types/database'

interface CreateSalePayload {
  register_id: string
  customer_id?: string | null
  items: Array<{
    variant_id: string
    quantity: number
    unit_price: number
    discount_amount?: number
    discount_type?: DiscountType | null
  }>
  payments: Array<{
    method: 'cash' | 'card' | 'transfer' | 'mobile_payment' | 'other'
    amount: number
    reference?: string | null
  }>
  discount_amount?: number
  discount_type?: DiscountType | null
  notes?: string | null
  delivery_amount?: number
  customer_name?: string | null
}

export async function createSale(payload: CreateSalePayload) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  try {
    // Sanitizar items para que coincidan exactamente con la estructura de sale_item_input
    // que espera PostgreSQL: (variant_id, quantity, unit_price, discount_amount, discount_type)
    const sanitizedItems = payload.items.map(item => ({
      variant_id: item.variant_id,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      discount_amount: Number(item.discount_amount || 0),
      discount_type: item.discount_type || null
    }))

    // Sanitizar pagos para que coincidan exactamente con payment_input
    // que espera PostgreSQL: (method, amount, reference)
    const sanitizedPayments = payload.payments.map(payment => ({
      method: payment.method,
      amount: Number(payment.amount),
      reference: payment.reference || null
    }))

    // Realizar la llamada RPC a create_sale con los parámetros sanitizados
    const { data: saleId, error } = await (supabase as any).rpc('create_sale', {
      p_register_id: payload.register_id,
      p_created_by: user.id,
      p_customer_id: payload.customer_id || null,
      p_items: sanitizedItems as any,
      p_payments: sanitizedPayments as any,
      p_discount_amount: Number(payload.discount_amount || 0),
      p_discount_type: payload.discount_type || null,
      p_notes: payload.notes || null,
      p_delivery_amount: Number(payload.delivery_amount || 0),
      p_customer_name: payload.customer_name || 'Cliente Estándar'
    })

    if (error) {
      console.error('RPC create_sale error:', error)
      return { error: error.message || 'Error al procesar la venta' }
    }

    // Fetch sale_number for the invoice PDF
    let saleNumber: string | number = saleId
    if (saleId) {
      const { data: saleRow } = await (supabase as any)
        .from('sales')
        .select('sale_number')
        .eq('id', saleId)
        .single()
      if (saleRow?.sale_number) saleNumber = saleRow.sale_number
    }

    revalidatePath('/ventas')
    revalidatePath('/ventas/historial')
    revalidatePath('/') // Dashboard
    
    return { success: true, saleId, saleNumber }
  } catch (err: any) {
    console.error('Exception in createSale:', err)
    return { error: err.message || 'Error inesperado' }
  }
}


export async function voidSale(saleId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  try {
    // 1. Verify admin role
    const { data: profile, error: profileErr } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileErr || (profile as any)?.role !== 'admin') {
      return { error: 'No autorizado. Solo los administradores pueden anular ventas.' }
    }

    // 2. Fetch sale details
    const { data: sale, error: saleErr } = await (supabase as any)
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .single()

    if (saleErr || !sale) {
      return { error: 'No se encontró la venta especificada.' }
    }

    if ((sale as any).status === 'cancelled') {
      return { error: 'Esta venta ya se encuentra anulada.' }
    }

    // 3. Fetch sale items
    const { data: saleItems, error: itemsErr } = await (supabase as any)
      .from('sale_items')
      .select('*')
      .eq('sale_id', saleId)

    if (itemsErr || !saleItems || (saleItems as any[]).length === 0) {
      return { error: 'No se encontraron ítems asociados a esta venta.' }
    }

    // 4. Return stock and log movements
    for (const item of (saleItems as any[])) {
      // Get current variant stock
      const { data: variant, error: varErr } = await (supabase as any)
        .from('product_variants')
        .select('stock_quantity')
        .eq('id', item.variant_id)
        .single()

      if (varErr || !variant) {
        return { error: `No se pudo obtener la variante del producto para reincorporar stock.` }
      }

      const currentStock = (variant as any).stock_quantity
      const newStock = currentStock + item.quantity

      // Update variant stock
      const { error: updateVarErr } = await (supabase as any)
        .from('product_variants')
        .update({ stock_quantity: newStock })
        .eq('id', item.variant_id)

      if (updateVarErr) {
        return { error: 'Error al actualizar el stock de una de las variantes.' }
      }

      // Record inventory return movement
      const { error: moveErr } = await (supabase as any)
        .from('inventory_movements')
        .insert({
          variant_id: item.variant_id,
          type: 'return',
          quantity: item.quantity, // Positive number represents entry back into stock
          stock_before: currentStock,
          stock_after: newStock,
          reference_id: saleId,
          reference_type: 'sale',
          notes: `Anulación de venta #${(sale as any).sale_number}`,
          created_by: user.id
        })

      if (moveErr) {
        console.error('Error recording inventory movement:', moveErr)
      }
    }

    // 5. Reverse cash payment if applicable
    const { data: payments, error: payErr } = await (supabase as any)
      .from('payments')
      .select('*')
      .eq('sale_id', saleId)

    if (!payErr && payments) {
      const cashPaid = (payments as any[])
        .filter((p: any) => p.method === 'cash')
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0)

      if (cashPaid > 0) {
        const { error: cashMoveErr } = await (supabase as any)
          .from('cash_movements')
          .insert({
            register_id: (sale as any).register_id,
            type: 'adjustment',
            amount: -cashPaid, // Negative amount to reflect the outflow (refund)
            description: `Anulación de venta ${(sale as any).sale_number} (Devolución de efectivo)`,
            reference_id: saleId,
            created_by: user.id
          })

        if (cashMoveErr) {
          console.error('Error recording cash movement reversal:', cashMoveErr)
        }
      }
    }

    // 6. Update sale status to cancelled
    const { error: updateSaleErr } = await (supabase as any)
      .from('sales')
      .update({ status: 'cancelled' })
      .eq('id', saleId)

    if (updateSaleErr) {
      return { error: 'Error al anular el estado de la venta.' }
    }

    // Revalidate paths
    revalidatePath('/ventas')
    revalidatePath('/ventas/historial')
    revalidatePath('/inventario/movimientos')
    revalidatePath('/') // Dashboard

    return { success: true }
  } catch (err: any) {
    console.error('Exception in voidSale Server Action:', err)
    return { error: err.message || 'Error inesperado al anular la venta' }
  }
}

