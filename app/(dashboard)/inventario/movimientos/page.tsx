import { createClient } from '@/lib/supabase/server'
import { Activity, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { MovementsListClient } from './movements-list-client'

interface PageProps {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
  }>
}

export default async function MovimientosInventarioPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { startDate, endDate } = await searchParams

  let query = supabase
    .from('inventory_movements')
    .select(`
      id, type, quantity, stock_before, stock_after, reference_type, notes, created_at,
      variant:product_variants(sku, size, color, product:products(name, category:categories(name)))
    `)

  if (startDate) {
    query = query.gte('created_at', `${startDate}T00:00:00`)
  }
  if (endDate) {
    query = query.lte('created_at', `${endDate}T23:59:59`)
  }

  const { data: rows, error } = await query
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) console.error('Error cargando movimientos:', error)
  const movements = (rows as any[]) || []

  const entries = movements.filter((m: any) => m.quantity > 0)
  const exits = movements.filter((m: any) => m.quantity < 0)
  const totalIn = entries.reduce((sum: number, m: any) => sum + m.quantity, 0)
  const totalOut = exits.reduce((sum: number, m: any) => sum + Math.abs(m.quantity), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Movimientos de Inventario</h1>
        <p className="text-muted-foreground">Historial de entradas, salidas y ajustes de stock</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:pt-5 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-bold truncate">{movements.length}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Total Movimientos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-5 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <ArrowUpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-bold text-success truncate">{entries.length}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Entradas ({totalIn} uds.)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-5 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <ArrowDownCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-bold text-destructive truncate">{exits.length}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Salidas ({totalOut} uds.)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-5 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-bold truncate">{movements.filter((m: any) => m.type === 'adjustment').length}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Ajustes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MovementsListClient initialMovements={movements} />
    </div>
  )
}
