// @ts-nocheck
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface AddStockPayload {
  variant_id: string
  quantity_to_add: number
  reason: string
}

export async function addStockQuantity(payload: AddStockPayload) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  if (payload.quantity_to_add <= 0) {
    return { error: 'La cantidad a agregar debe ser mayor a 0' }
  }

  try {
    // 1. Obtener la variante actual para saber su stock actual
    const { data: variant, error: varError } = await (supabase as any)
      .from('product_variants')
      .select('id, stock_quantity')
      .eq('id', payload.variant_id)
      .single()

    if (varError || !variant) {
      return { error: 'No se encontró la variante solicitada' }
    }

    const newStock = Number(variant.stock_quantity) + Number(payload.quantity_to_add)

    // 2. Ejecutar la función RPC adjust_inventory de FULL_MIGRATION.sql
    // Esto actualiza el stock y guarda el kardex en inventory_movements automáticamente
    const { error: rpcError } = await (supabase as any).rpc('adjust_inventory', {
      p_variant_id: payload.variant_id,
      p_new_quantity: newStock,
      p_reason: `[Entrada de Stock] ${payload.reason || 'Reposición / Entrada de mercancía'} (+${payload.quantity_to_add} unid.)`,
      p_created_by: user.id
    })

    if (rpcError) {
      console.error('Error al agregar stock:', rpcError)
      return { error: rpcError.message || 'Error al actualizar el stock' }
    }

    revalidatePath('/inventario')
    revalidatePath('/productos')
    return { success: true, newStock }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado al agregar stock' }
  }
}
