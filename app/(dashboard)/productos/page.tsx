import { createClient } from '@/lib/supabase/server'
import type { ProductWithDetails } from '@/types/database'
import { ProductsClient } from './products-client'

export default async function ProductosPage() {
  const supabase = await createClient()

  // Get current user's role for conditional rendering
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const isAdmin = (profile as any)?.role === 'admin'

  // Fetch products with related data
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      categories(id, name, slug, description),
      brands(id, name, slug, logo_url),
      product_images(*),
      product_variants(*)
    `)
    .neq('status', 'discontinued')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching products:', error)
  }

  // Fetch categories and brands for filter dropdowns
  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    supabase.from('brands').select('id, name').eq('is_active', true).order('name'),
  ])

  const typedProducts = (products || []) as unknown as ProductWithDetails[]

  return (
    <ProductsClient
      initialProducts={typedProducts}
      categories={categories || []}
      brands={brands || []}
      isAdmin={isAdmin}
    />
  )
}
