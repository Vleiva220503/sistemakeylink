import { createClient } from '@/lib/supabase/server'
import { InventoryClient } from '@/components/features/inventory/inventory-client'

export default async function InventarioPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const isAdmin = (profile as any)?.role === 'admin'

  const { data: rows } = await (supabase as any)
    .from('product_variants')
    .select(`
      id, sku, size, color, quality, image_url, stock_quantity, stock_min, stock_reorder_point, cost, is_active,
      product:products(
        id, name, sku, status, description, category_id, brand_id,
        categories(id, name, slug, description),
        brands(id, name, slug, logo_url),
        product_images(url, is_primary, sort_order)
      )
    `)
    .eq('is_active', true)
    .order('stock_quantity', { ascending: true })
    .limit(100)

  const variants = (rows as any[]) || []

  return <InventoryClient initialVariants={variants} isAdmin={isAdmin} />
}
