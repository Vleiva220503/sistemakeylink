import { createClient } from '@/lib/supabase/server'
import { TopProductsReportClient } from './top-products-client'

interface Props {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
  }>
}

export default async function ReporteProductosPopularesPage({ searchParams }: Props) {
  const { startDate, endDate } = await searchParams
  const supabase = await createClient()

  // Calculate default dates (past 30 days)
  const todayStr = new Date().toISOString().split('T')[0]
  const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const finalStartDate = startDate || defaultStartDate
  const finalEndDate = endDate || todayStr

  // Load completed sale items in the date range
  const { data: rows, error: itemsErr } = await supabase
    .from('sale_items')
    .select(`
      id, quantity, unit_price, total,
      variant:product_variants(
        id, sku,
        product:products(
          id, name, category_id, brand_id,
          category:categories(name),
          brand:brands(name)
        )
      ),
      sale:sales!inner(created_at, status)
    `)
    .eq('sale.status', 'completed')
    .gte('sale.created_at', `${finalStartDate}T00:00:00`)
    .lte('sale.created_at', `${finalEndDate}T23:59:59`)

  if (itemsErr) {
    console.error('Error fetching top products items:', itemsErr)
  }

  const items = rows || []

  // Group items by product in JS
  const productMap: Record<string, any> = {}
  items.forEach((item: any) => {
    const product = item.variant?.product
    if (!product) return
    const productId = product.id

    if (!productMap[productId]) {
      productMap[productId] = {
        productId,
        name: product.name || '—',
        sku: item.variant?.sku || '—',
        category: product.category?.name || '—',
        brand: product.brand?.name || '—',
        categoryId: product.category_id || '',
        brandId: product.brand_id || '',
        unitsSold: 0,
        revenue: 0,
      }
    }

    productMap[productId].unitsSold += item.quantity
    productMap[productId].revenue += Number(item.total)
  })

  const sortedProducts = Object.values(productMap).sort((a: any, b: any) => b.revenue - a.revenue)

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

  return (
    <TopProductsReportClient
      initialData={sortedProducts}
      categories={categories}
      brands={brands}
      startDate={finalStartDate}
      endDate={finalEndDate}
    />
  )
}
