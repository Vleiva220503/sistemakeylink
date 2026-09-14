import { createClient } from '@/lib/supabase/server'
import { SupplierForm } from './supplier-form'
import { SuppliersListClient } from './suppliers-list-client'

export default async function ProveedoresPage() {
  const supabase = await createClient()
  const { data: rows } = await (supabase as any)
    .from('suppliers')
    .select('*')
    .order('name')

  const suppliers = (rows as any[]) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground">Gestiona tus proveedores y sus contactos</p>
        </div>
        <SupplierForm />
      </div>

      <SuppliersListClient initialSuppliers={suppliers} />
    </div>
  )
}
