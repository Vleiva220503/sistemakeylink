'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── CHECK BRAND NAME ─────────────────────────────────────────────────────────

export async function checkBrandNameExists(name: string, excludeId?: string) {
  const supabase = await createClient()
  let query = (supabase as any)
    .from('brands')
    .select('id, is_active')
    .ilike('name', name.trim())
  if (excludeId) {
    query = query.neq('id', excludeId)
  }
  const { data } = await query.maybeSingle()
  if (!data) return { exists: false, isInactive: false, id: null }
  return { exists: true, isInactive: !data.is_active, id: data.id as string }
}

// ── CHECK CATEGORY NAME ───────────────────────────────────────────────────────

export async function checkCategoryNameExists(name: string, excludeId?: string) {
  const supabase = await createClient()
  let query = (supabase as any)
    .from('categories')
    .select('id, is_active')
    .ilike('name', name.trim())
  if (excludeId) {
    query = query.neq('id', excludeId)
  }
  const { data } = await query.maybeSingle()
  if (!data) return { exists: false, isInactive: false, id: null }
  return { exists: true, isInactive: !data.is_active, id: data.id as string }
}

// ── CATEGORIES ──────────────────────────────────────────────────────────────

export async function createCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  if (!name) return { error: 'El nombre es obligatorio' }
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const { error } = await (supabase as any)
    .from('categories')
    .insert({ name, slug, description, is_active: true })

  if (error) return { error: error.message }
  revalidatePath('/categorias')
  return { success: true }
}

export async function updateCategory(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  if (!name) return { error: 'El nombre es obligatorio' }
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const { error } = await (supabase as any)
    .from('categories')
    .update({ name, slug, description })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/categorias')
  return { success: true }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Verify no active products are using this category
  const { count, error: countError } = await (supabase as any)
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
    .neq('status', 'discontinued')

  if (countError) return { error: 'Error al verificar los productos asociados a esta categoría.' }

  if (count && count > 0) {
    return {
      error: `Esta categoría tiene ${count} producto${count > 1 ? 's' : ''} activo${count > 1 ? 's' : ''} asociado${count > 1 ? 's' : ''}. Elimina o reasigna esos productos antes de eliminar la categoría.`,
      blocked: true,
      productCount: count as number,
    }
  }

  const { error } = await (supabase as any)
    .from('categories')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/categorias')
  return { success: true }
}

export async function reactivateCategory(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await (supabase as any)
    .from('categories')
    .update({ is_active: true })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/categorias')
  return { success: true }
}

// ── BRANDS ──────────────────────────────────────────────────────────────────

export async function createBrand(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const logo_url = (formData.get('logo_url') as string)?.trim() || null
  if (!name) return { error: 'El nombre es obligatorio' }
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const { error } = await (supabase as any)
    .from('brands')
    .insert({ name, slug, description, logo_url, is_active: true })

  if (error) return { error: error.message }
  revalidatePath('/marcas')
  return { success: true }
}

export async function updateBrand(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const logo_url = (formData.get('logo_url') as string)?.trim() || null
  if (!name) return { error: 'El nombre es obligatorio' }
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const { error } = await (supabase as any)
    .from('brands')
    .update({ name, slug, description, logo_url })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/marcas')
  return { success: true }
}

export async function deleteBrand(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Verify no active products are using this brand
  const { count, error: countError } = await (supabase as any)
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', id)
    .neq('status', 'discontinued')

  if (countError) return { error: 'Error al verificar los productos asociados a esta marca.' }

  if (count && count > 0) {
    return {
      error: `Esta marca tiene ${count} producto${count > 1 ? 's' : ''} activo${count > 1 ? 's' : ''} asociado${count > 1 ? 's' : ''}. Elimina o reasigna esos productos antes de eliminar la marca.`,
      blocked: true,
      productCount: count as number,
    }
  }

  const { error } = await (supabase as any)
    .from('brands')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/marcas')
  return { success: true }
}

export async function reactivateBrand(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await (supabase as any)
    .from('brands')
    .update({ is_active: true })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/marcas')
  return { success: true }
}

// ── SUPPLIERS ────────────────────────────────────────────────────────────────

export async function createSupplier(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const payload = {
    name: (formData.get('name') as string)?.trim(),
    contact_name: (formData.get('contact_name') as string)?.trim() || null,
    phone: (formData.get('phone') as string)?.trim() || null,
    email: (formData.get('email') as string)?.trim() || null,
    address: (formData.get('address') as string)?.trim() || null,
    notes: (formData.get('notes') as string)?.trim() || null,
    is_active: true,
  }
  if (!payload.name) return { error: 'El nombre es obligatorio' }

  const { error } = await (supabase as any).from('suppliers').insert(payload)
  if (error) return { error: error.message }
  revalidatePath('/proveedores')
  return { success: true }
}

export async function updateSupplier(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const payload = {
    name: (formData.get('name') as string)?.trim(),
    contact_name: (formData.get('contact_name') as string)?.trim() || null,
    phone: (formData.get('phone') as string)?.trim() || null,
    email: (formData.get('email') as string)?.trim() || null,
    address: (formData.get('address') as string)?.trim() || null,
    notes: (formData.get('notes') as string)?.trim() || null,
  }

  const { error } = await (supabase as any).from('suppliers').update(payload).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/proveedores')
  return { success: true }
}

export async function deleteSupplier(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await (supabase as any).from('suppliers').update({ is_active: false }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/proveedores')
  return { success: true }
}

// ── CUSTOMERS ────────────────────────────────────────────────────────────────

export async function createCustomer(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const payload = {
    name: (formData.get('name') as string)?.trim(),
    email: (formData.get('email') as string)?.trim() || null,
    phone: (formData.get('phone') as string)?.trim() || null,
    address: (formData.get('address') as string)?.trim() || null,
    notes: (formData.get('notes') as string)?.trim() || null,
    credit_limit: Number(formData.get('credit_limit')) || 0,
    is_active: true,
  }
  if (!payload.name) return { error: 'El nombre es obligatorio' }

  const { error } = await (supabase as any).from('customers').insert(payload)
  if (error) return { error: error.message }
  revalidatePath('/clientes')
  return { success: true }
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const payload = {
    name: (formData.get('name') as string)?.trim(),
    email: (formData.get('email') as string)?.trim() || null,
    phone: (formData.get('phone') as string)?.trim() || null,
    address: (formData.get('address') as string)?.trim() || null,
    notes: (formData.get('notes') as string)?.trim() || null,
    credit_limit: Number(formData.get('credit_limit')) || 0,
  }

  const { error } = await (supabase as any).from('customers').update(payload).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/clientes')
  return { success: true }
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await (supabase as any).from('customers').update({ is_active: false }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/clientes')
  return { success: true }
}

// ── EXPENSES ─────────────────────────────────────────────────────────────────

export async function createExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const payload = {
    description: (formData.get('description') as string)?.trim(),
    amount: Number(formData.get('amount')),
    category_id: (formData.get('category_id') as string) || null,
    expense_date: (formData.get('expense_date') as string) || new Date().toISOString().split('T')[0],
    notes: (formData.get('notes') as string)?.trim() || null,
    receipt_url: (formData.get('receipt_url') as string)?.trim() || null,
    created_by: user.id,
  }
  if (!payload.description) return { error: 'La descripción es obligatoria' }
  if (!payload.amount || payload.amount <= 0) return { error: 'El monto debe ser mayor que 0' }

  const { error } = await (supabase as any).from('expenses').insert(payload)
  if (error) return { error: error.message }
  revalidatePath('/gastos')
  return { success: true }
}

export async function updateExpense(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const payload = {
    description: (formData.get('description') as string)?.trim(),
    amount: Number(formData.get('amount')),
    category_id: (formData.get('category_id') as string) || null,
    expense_date: (formData.get('expense_date') as string) || new Date().toISOString().split('T')[0],
    notes: (formData.get('notes') as string)?.trim() || null,
  }

  const { error } = await (supabase as any).from('expenses').update(payload).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/gastos')
  return { success: true }
}

export async function cancelExpense(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await (supabase as any)
    .from('expenses')
    .update({ is_cancelled: true })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/gastos')
  return { success: true }
}

// ── PURCHASES ────────────────────────────────────────────────────────────────

export async function createPurchase(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const reference_number = `OC-${Date.now()}`
  const supplier_id = (formData.get('supplier_id') as string) || null
  const expected_date = (formData.get('expected_date') as string) || null
  const notes = (formData.get('notes') as string)?.trim() || null

  const { data: purchase, error } = await (supabase as any)
    .from('purchases')
    .insert({
      reference_number,
      supplier_id,
      expected_date,
      notes,
      created_by: user.id,
      status: 'draft'
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Parse items from form: items[0][variant_id], items[0][quantity_ordered], items[0][unit_cost]
  // Items are passed as JSON string for simplicity
  const itemsJson = formData.get('items') as string
  if (itemsJson) {
    try {
      const items = JSON.parse(itemsJson)
      if (items.length > 0) {
        const itemsToInsert = items.map((item: any) => ({
          purchase_id: purchase.id,
          variant_id: item.variant_id,
          quantity_ordered: Number(item.quantity_ordered),
          quantity_received: 0,
          unit_cost: Number(item.unit_cost),
        }))
        const { error: itemsError } = await (supabase as any).from('purchase_items').insert(itemsToInsert)
        if (itemsError) {
          // Rollback: delete the purchase header
          await (supabase as any).from('purchases').delete().eq('id', purchase.id)
          return { error: `Error al agregar items: ${itemsError.message}` }
        }
      }
    } catch (e) {
      // If items JSON is invalid, still return the purchase header created
    }
  }

  revalidatePath('/compras')
  return { success: true, purchaseId: purchase.id }
}

// ── GENERIC DELETE ────────────────────────────────────────────────────────────

export async function deleteRecord(table: string, id: string, softDelete: boolean = true) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  let error
  if (softDelete) {
    ;({ error } = await (supabase as any).from(table).update({ is_active: false }).eq('id', id))
  } else {
    ;({ error } = await (supabase as any).from(table).delete().eq('id', id))
  }

  if (error) return { error: error.message }
  
  // Revalidate potential paths
  revalidatePath('/proveedores')
  revalidatePath('/clientes')
  revalidatePath('/marcas')
  revalidatePath('/categorias')
  revalidatePath('/gastos')
  revalidatePath('/productos')
  revalidatePath('/compras')

  return { success: true }
}

