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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{movements.length}</p>
                <p className="text-xs text-muted-foreground">Total Movimientos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                <ArrowUpCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-bold text-success">{entries.length}</p>
                <p className="text-xs text-muted-foreground">Entradas ({totalIn} uds.)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <ArrowDownCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold text-destructive">{exits.length}</p>
                <p className="text-xs text-muted-foreground">Salidas ({totalOut} uds.)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xl font-bold">{movements.filter((m: any) => m.type === 'adjustment').length}</p>
                <p className="text-xs text-muted-foreground">Ajustes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MovementsListClient initialMovements={movements} />
    </div>
  )
}
