import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/components/features/products/product-form'
import type { UserRole } from '@/types/database'

export default async function NewProductPage() {
  const supabase = await createClient()

  const [
    { data: categoriesData },
    { data: brandsData },
    { data: suppliersData },
    { data: authData },
  ] = await Promise.all([
    supabase.from('categories').select('id, name, slug, description').eq('is_active', true).order('name'),
    supabase.from('brands').select('id, name, slug, description, logo_url').eq('is_active', true).order('name'),
    supabase.from('suppliers').select('id, name').eq('is_active', true).order('name'),
    supabase.auth.getUser(),
  ])

  const user = authData?.user

  // Improvement G: fetch role to conditionally show cost field in the form
  let userRole: UserRole | undefined
  if (user) {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    userRole = profile?.role as UserRole | undefined
  }

  return (
    <div className="mx-auto max-w-5xl">
      <ProductForm
        categories={categoriesData || []}
        brands={brandsData || []}
        suppliers={suppliersData || []}
        userRole={userRole}
      />
    </div>
  )
}
