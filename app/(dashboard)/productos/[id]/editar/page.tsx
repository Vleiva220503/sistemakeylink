import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProductForm } from '@/components/features/products/product-form'
import type { ProductWithDetails, UserRole } from '@/types/database'

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  const supabase = await createClient()

  // Buscar el producto con sus variantes, imágenes, categoría y marca, más lista general y usuario
  const [
    { data, error },
    { data: categoriesData },
    { data: brandsData },
    { data: authData },
  ] = await Promise.all([
    supabase
      .from('products')
      .select(`
        *,
        categories(id, name, slug, description),
        brands(id, name, slug, description, logo_url),
        product_images(*),
        product_variants(*)
      `)
      .eq('id', resolvedParams.id)
      .single(),
    supabase.from('categories').select('id, name, slug, description').eq('is_active', true).order('name'),
    supabase.from('brands').select('id, name, slug, description, logo_url').eq('is_active', true).order('name'),
    supabase.auth.getUser(),
  ])

  if (error || !data) {
    notFound()
  }

  const user = authData?.user

  let userRole: UserRole | undefined
  if (user) {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    userRole = profile?.role as UserRole | undefined
  }

  const product = data as unknown as ProductWithDetails

  return (
    <ProductForm
      initialProduct={product}
      categories={categoriesData || []}
      brands={brandsData || []}
      userRole={userRole}
    />
  )
}
