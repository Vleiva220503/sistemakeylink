// @ts-nocheck
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ReturnType, ReturnItemInput } from '@/types/database'

interface ProcessReturnPayload {
  original_sale_id: string
  type: ReturnType
  reason: string
  items: ReturnItemInput[]
  notes?: string
}

export async function processReturn(payload: ProcessReturnPayload) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Admin only for returns
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Permisos insuficientes para procesar devoluciones' }
  }

  try {
    const { data: returnId, error } = await (supabase as any).rpc('process_return', {
      p_original_sale_id: payload.original_sale_id,
      p_type: payload.type,
      p_reason: payload.reason,
      p_items: payload.items,
      p_created_by: user.id,
      p_notes: payload.notes
    } as any)

    if (error) {
      console.error('RPC process_return error:', error)
      return { error: error.message || 'Error al procesar la devolución' }
    }

    revalidatePath('/ventas/historial')
    revalidatePath('/inventario')
    revalidatePath('/')
    
    return { success: true, returnId }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado' }
  }
}
