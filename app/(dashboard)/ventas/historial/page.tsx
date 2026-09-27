import { createClient } from '@/lib/supabase/server'
import { ShoppingCart, CheckCircle, Clock, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { SalesListClient } from './sales-list-client'

const PAGE_SIZE = 50

interface PageProps {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
    page?: string
  }>
}

export default async function HistorialVentasPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { startDate, endDate, page: pageParam } = await searchParams
  const currentPage = Math.max(0, parseInt(pageParam || '0', 10))

  // Get active session user role
  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false
  if (user) {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = (profile as any)?.role === 'admin'
  }

  // Build base query (reused for count + data)
  function buildQuery(q: ReturnType<typeof supabase.from>) {
    if (startDate) q = (q as any).gte('created_at', `${startDate}T00:00:00-06:00`)
    if (endDate) q = (q as any).lte('created_at', `${endDate}T23:59:59-06:00`)
    return q
  }

  // 1. Get total count for this filter combination
  const { count: totalCount } = await buildQuery(
    supabase.from('sales').select('*', { count: 'exact', head: true }) as any
  ) as any

  const safeTotal = totalCount ?? 0
  const from = currentPage * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // 2. Get the current page of data
  const { data: rows, error } = await buildQuery(
    supabase.from('sales').select(`
      id, sale_number, status, subtotal, discount_amount, delivery_amount, delivery_type, total, amount_paid, amount_pending,
      notes, created_at, completed_at,
      customer:customers(name),
      register:cash_registers(name),
      sale_items(id, quantity, unit_price, discount_amount, total),
      payments(method, amount),
      cajero:profiles!sales_created_by_fkey(full_name)
    `) as any
  ).order('created_at', { ascending: false }).range(from, to)

  if (error) console.error('Error cargando historial:', error)
  const sales = (rows as any[]) || []

  // 3. Get lightweight data for full KPIs across the entire filter (mimicking previous behavior)
  const { data: kpiRows } = await buildQuery(
    supabase.from('sales').select('status, total, amount_pending') as any
  )
  const kpiSales = (kpiRows as any[]) || []
  const completedSales = kpiSales.filter((s: any) => s.status === 'completed')
  const totalRevenue = completedSales.reduce((sum: number, s: any) => sum + Number(s.total), 0)
  const pendingAmount = kpiSales.reduce((sum: number, s: any) => sum + Number(s.amount_pending), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Historial de Ventas</h1>
        <p className="text-muted-foreground">Registro completo de todas las transacciones</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{sales.length}</p>
                <p className="text-xs text-muted-foreground">Total Ventas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-bold">{completedSales.length}</p>
                <p className="text-xs text-muted-foreground">Completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">Ingresos Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatCurrency(pendingAmount)}</p>
                <p className="text-xs text-muted-foreground">Por Cobrar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <SalesListClient initialSales={sales} isAdmin={isAdmin} totalCount={safeTotal} currentPage={currentPage} pageSize={PAGE_SIZE} />
    </div>
  )
}
