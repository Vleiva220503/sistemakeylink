// @ts-nocheck
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductVariantInsert = Database['public']['Tables']['product_variants']['Insert']
type ProductImageInsert = Database['public']['Tables']['product_images']['Insert']

interface CreateProductPayload {
  product: Omit<ProductInsert, 'id'>
  variants: Omit<ProductVariantInsert, 'product_id' | 'id' | 'version'>[]
  images: Omit<ProductImageInsert, 'product_id' | 'id'>[]
}

// Improvement A: SKU uniqueness check (used by the form before submit)
export async function checkSkuExists(sku: string, excludeId?: string) {
  const supabase = await createClient()
  let query = (supabase as any)
    .from('products')
    .select('id, status')
    .eq('sku', sku)
  if (excludeId) {
    query = query.neq('id', excludeId)
  }
  const { data } = await query.maybeSingle()
  if (!data) return { exists: false, isDiscontinued: false, id: null }
  return {
    exists: true,
    isDiscontinued: data.status === 'discontinued',
    id: data.id as string,
  }
}

export async function createProduct(payload: CreateProductPayload) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado. Inicia sesión para continuar.' }

  // Insert Product
  const { data: newProduct, error: productError } = await supabase
    .from('products')
    .insert(payload.product as any)
    .select('id')
    .single()

  if (productError || !newProduct) {
    // Improvement D: translate Supabase error codes to user-friendly messages
    if (productError?.code === '23505') {
      return { error: 'Ya existe un producto con ese SKU. Por favor usa un SKU diferente.' }
    }
    if (productError?.code === '42501') {
      return { error: 'Permisos insuficientes. Solo los administradores pueden crear productos.' }
    }
    return { error: productError?.message || 'Error al crear el producto. Intenta de nuevo.' }
  }

  const productId = newProduct.id

  // Insert Images if any
  if (payload.images.length > 0) {
    const imagesToInsert = payload.images.map(img => ({
      ...img,
      product_id: productId
    }))
    const { error: imagesError } = await supabase
      .from('product_images')
      .insert(imagesToInsert as any)
    if (imagesError) {
      console.error('Error creating product images:', imagesError)
      // Non-fatal: product was created, just log image error
    }
  }

  // Insert Variants (always at least one)
  if (payload.variants.length > 0) {
    const variantsToInsert = payload.variants.map(v => ({
      ...v,
      product_id: productId
    }))

    const { error: variantsError } = await supabase
      .from('product_variants')
      .insert(variantsToInsert as any)

    if (variantsError) {
      // Rollback: delete the orphaned product header
      await supabase.from('products').delete().eq('id', productId)
      if (variantsError.code === '23505') {
        return { error: 'El SKU de variante ya está en uso. Por favor cambia el SKU del producto.' }
      }
      return { error: variantsError.message || 'Error al crear la variante del producto.' }
    }
  } else {
    // Fallback: always ensure at least one variant exists
    const { error: defaultVariantError } = await supabase
      .from('product_variants')
      .insert({
        product_id: productId,
        sku: `${payload.product.sku}-DEF`,
        cost: 0,
        stock_quantity: 0,
        stock_min: 0,
        stock_reorder_point: 0
      } as any)

    if (defaultVariantError) {
      await supabase.from('products').delete().eq('id', productId)
      return { error: 'Error al crear la variante por defecto del producto.' }
    }
  }

  revalidatePath('/productos')
  revalidatePath('/inventario')
  return { success: true, productId }
}

export async function updateProduct(productId: string, payload: Partial<CreateProductPayload>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado. Inicia sesión para continuar.' }

  if (payload.product) {
    const { error } = await supabase
      .from('products')
      .update(payload.product as any)
      .eq('id', productId)

    if (error) {
      if (error.code === '23505') {
        return { error: 'Ya existe un producto con ese SKU.' }
      }
      if (error.code === '42501') {
        return { error: 'Permisos insuficientes. Solo los administradores pueden editar productos.' }
      }
      return { error: error.message || 'Error al actualizar el producto.' }
    }
  }

  // Sync the default variant (cost, stock_quantity, sku) if variants are provided
  if (payload.variants && payload.variants.length > 0) {
    const variantUpdate = payload.variants[0]

    // Get the existing default variant for this product
    const { data: existingVariant, error: fetchError } = await supabase
      .from('product_variants')
      .select('id, sku')
      .eq('product_id', productId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!fetchError && existingVariant) {
      const variantPatch: any = {}
      if (variantUpdate.cost !== undefined) variantPatch.cost = variantUpdate.cost
      if (variantUpdate.stock_quantity !== undefined) variantPatch.stock_quantity = variantUpdate.stock_quantity
      if (variantUpdate.sku !== undefined) variantPatch.sku = variantUpdate.sku

      if (Object.keys(variantPatch).length > 0) {
        const { error: variantError } = await supabase
          .from('product_variants')
          .update(variantPatch)
          .eq('id', existingVariant.id)

        if (variantError) {
          // Non-fatal: product was updated, log but continue
          console.error('Error syncing variant on product update:', variantError.message)
        }
      }
    }
  }

  revalidatePath('/productos')
  revalidatePath(`/productos/${productId}`)
  revalidatePath('/inventario')
  return { success: true }
}

export async function deleteProduct(productId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Permisos insuficientes. Solo los administradores pueden eliminar productos.' }
  }

  // Soft delete via status
  const { error } = await supabase
    .from('products')
    .update({ status: 'discontinued' } as any)
    .eq('id', productId)

  if (error) return { error: error.message || 'Error al eliminar el producto.' }

  revalidatePath('/productos')
  revalidatePath('/inventario')
  return { success: true }
}

/**
 * Safe product deletion: checks that total stock across all variants is 0
 * before marking the product as discontinued.
 */
export async function deleteProductSafe(productId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Permisos insuficientes. Solo los administradores pueden eliminar productos.' }
  }

  // Get all variants to compute total stock
  const { data: variants, error: variantError } = await supabase
    .from('product_variants')
    .select('stock_quantity, sku')
    .eq('product_id', productId)

  if (variantError) {
    return { error: 'Error al verificar el stock del producto. Intenta de nuevo.' }
  }

  const totalStock = (variants || []).reduce((sum, v) => sum + (v.stock_quantity || 0), 0)

  if (totalStock > 0) {
    return {
      error: `Este producto tiene ${totalStock} unidad${totalStock > 1 ? 'es' : ''} en stock. Ajusta el stock a 0 antes de eliminarlo.`,
      blocked: true,
      stockAmount: totalStock,
    }
  }

  // Stock is zero — proceed with soft-delete
  const { error } = await supabase
    .from('products')
    .update({ status: 'discontinued' } as any)
    .eq('id', productId)

  if (error) return { error: error.message || 'Error al eliminar el producto.' }

  revalidatePath('/productos')
  revalidatePath('/inventario')
  return { success: true }
}

export async function reactivateProduct(productId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado.' }

  const { error } = await supabase
    .from('products')
    .update({ status: 'active' } as any)
    .eq('id', productId)

  if (error) return { error: error.message || 'Error al reactivar el producto.' }

  revalidatePath('/productos')
  revalidatePath('/inventario')
  return { success: true }
}
