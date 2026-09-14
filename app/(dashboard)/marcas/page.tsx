import { createClient } from '@/lib/supabase/server'
import { BrandForm } from './brand-form'
import { BrandsListClient } from './brands-list-client'

export default async function MarcasPage() {
  const supabase = await createClient()

  const { data: rows } = await (supabase as any)
    .from('brands')
    .select('*')
    .order('name')

  const brands = (rows as any[]) || []

  // Pre-fetch active product counts per brand
  const { data: productRows } = await (supabase as any)
    .from('products')
    .select('brand_id')
    .neq('status', 'discontinued')
    .not('brand_id', 'is', null)

  const productCountByBrand: Record<string, number> = {}
  for (const p of (productRows as any[]) || []) {
    if (p.brand_id) {
      productCountByBrand[p.brand_id] =
        (productCountByBrand[p.brand_id] || 0) + 1
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Marcas
          </h1>
          <p className="text-muted-foreground">
            Gestiona las marcas de tus productos
          </p>
        </div>
        <BrandForm />
      </div>

      <BrandsListClient
        brands={brands}
        productCountByBrand={productCountByBrand}
      />
    </div>
  )
}
