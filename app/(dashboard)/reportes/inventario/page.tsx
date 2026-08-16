import { createClient } from '@/lib/supabase/server'
import { InventoryReportClient } from './inventory-report-client'

export default async function ReporteInventarioPage() {
  const supabase = await createClient()

  // Get current user profile for admin validation
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const isAdmin = (profile as any)?.role === 'admin'

  // Fetch categories
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')
  const categories = categoriesData || []

  // Fetch brands
  const { data: brandsData } = await supabase
    .from('brands')
    .select('id, name')
    .order('name')
  const brands = brandsData || []

  // Fetch product variants with detailed info (no limit to ensure complete valuation reporting)
  const { data: rows } = await supabase
    .from('product_variants')
    .select(`
      id, sku, size, color, quality, cost, price_override, stock_quantity, stock_min, stock_reorder_point, is_active,
      product:products(
        id, name, base_price, category_id, brand_id,
        category:categories(id, name),
        brand:brands(id, name)
      )
    `)
    .eq('is_active', true)
    .order('stock_quantity', { ascending: true })

  const variants = rows || []

  return (
    <InventoryReportClient
      initialVariants={variants}
      categories={categories}
      brands={brands}
      isAdmin={isAdmin}
    />
  )
}
