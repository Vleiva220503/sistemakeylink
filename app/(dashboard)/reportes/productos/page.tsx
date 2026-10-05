import { createClient } from '@/lib/supabase/server'
import { TopProductsReportClient } from './top-products-client'
import { parseMonthParams, getMonthRange } from '@/lib/month-filter'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{
    year?: string
    month?: string
    view?: string
  }>
}

export default async function ReporteProductosPopularesPage({ searchParams }: Props) {
  const params = await searchParams
  const { year, month } = parseMonthParams(params)
  const { startISO, endISO, startDate, endDate } = getMonthRange(year, month)
  const supabase = await createClient()

  // Parallelizar: items del mes + categorías + marcas
  const [itemsResult, categoriesResult, brandsResult] = await Promise.all([
    supabase
      .from('sale_items')
      .select(`
        id, quantity, unit_price, total,
        variant:product_variants(
          id, sku,
          product:products(
            id, name, category_id, brand_id,
            category:categories(name, description),
            brand:brands(name)
          )
        ),
        sale:sales!inner(created_at, status)
      `)
      .eq('sale.status', 'completed')
      .gte('sale.created_at', startISO)
      .lte('sale.created_at', endISO),
    supabase.from('categories').select('id, name, description').order('name'),
    supabase.from('brands').select('id, name').order('name'),
  ])

  const items = itemsResult.data || []
  const categories = categoriesResult.data || []
  const brands = brandsResult.data || []

  // Group items by product
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
        categoryDescription: product.category?.description || '',
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

  return (
    <TopProductsReportClient
      initialData={sortedProducts}
      categories={categories}
      brands={brands}
      startDate={startDate}
      endDate={endDate}
      year={year}
      month={month}
    />
  )
}
