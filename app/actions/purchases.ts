// @ts-nocheck
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ReceiptItemInput } from '@/types/database'

export async function receivePurchase(purchaseId: string, items: ReceiptItemInput[], notes?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Admin only
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Permisos insuficientes' }
  }

  try {
    const { data: receiptId, error } = await (supabase as any).rpc('receive_purchase', {
      p_purchase_id: purchaseId,
      p_received_by: user.id,
      p_items: items,
      p_notes: notes
    } as any)

    if (error) {
      console.error('RPC receive_purchase error:', error)
      return { error: error.message || 'Error al procesar recepción de compra' }
    }

    revalidatePath('/compras')
    revalidatePath('/inventario')
    revalidatePath('/productos')
    return { success: true, receiptId }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado' }
  }
}
