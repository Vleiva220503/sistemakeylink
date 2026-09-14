import { createClient } from '@/lib/supabase/server'
import { CategoryForm } from './category-form'
import { CategoriesListClient } from './categories-list-client'

export default async function CategoriasPage() {
  const supabase = await createClient()

  const { data: rows } = await (supabase as any)
    .from('categories')
    .select('*')
    .order('name')

  const categories = (rows as any[]) || []

  // Pre-fetch active product counts per category
  const { data: productRows } = await (supabase as any)
    .from('products')
    .select('category_id')
    .neq('status', 'discontinued')
    .not('category_id', 'is', null)

  const productCountByCategory: Record<string, number> = {}
  for (const p of (productRows as any[]) || []) {
    if (p.category_id) {
      productCountByCategory[p.category_id] =
        (productCountByCategory[p.category_id] || 0) + 1
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Tallas
          </h1>
          <p className="text-muted-foreground">
            Gestiona las tallas de tus productos
          </p>
        </div>
        <CategoryForm />
      </div>

      <CategoriesListClient
        categories={categories}
        productCountByCategory={productCountByCategory}
      />
    </div>
  )
}
