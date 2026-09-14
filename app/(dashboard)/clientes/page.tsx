import { createClient } from '@/lib/supabase/server'
import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ClientForm } from './client-form'
import { CustomersListClient } from './customers-list-client'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from('customers')
    .select('*')
    .order('name')

  if (error) console.error('Error cargando clientes:', error)
  const customers = (rows as any[]) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestiona tu base de datos de clientes</p>
        </div>
        <ClientForm />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customers.length}</p>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customers.filter((c: any) => c.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {customers.filter((c: any) => Number(c.credit_limit) > 0).length}
                </p>
                <p className="text-sm text-muted-foreground">Con Crédito</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CustomersListClient initialCustomers={customers} />
    </div>
  )
}
