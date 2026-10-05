import { createClient } from '@/lib/supabase/server'
import { Activity, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { MovementsListClient } from './movements-list-client'
import { parseMonthParams, getMonthRange, monthName } from '@/lib/month-filter'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    year?: string
    month?: string
    page?: string
  }>
}

const PAGE_SIZE = 50

export default async function MovimientosInventarioPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const params = await searchParams
  const { year, month } = parseMonthParams(params)
  const { startISO, endISO } = getMonthRange(year, month)
  const currentPage = Math.max(0, parseInt(params.page || '0', 10))
  const from = currentPage * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: rows, count: totalCount, error } = await supabase
    .from('inventory_movements')
    .select(`
      id, type, quantity, stock_before, stock_after, reference_type, notes, created_at,
      variant:product_variants(sku, size, color, product:products(name, category:categories(name)))
    `, { count: 'exact' })
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) console.error('Error cargando movimientos:', error)
  const movements = (rows as any[]) || []
  const safeTotal = totalCount ?? 0

  // KPIs del mes seleccionado
  const { data: kpiRows } = await supabase
    .from('inventory_movements')
    .select('quantity')
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  const kpiMovements = (kpiRows as any[]) || []
  const entries = kpiMovements.filter((m: any) => m.quantity > 0)
  const exits = kpiMovements.filter((m: any) => m.quantity < 0)
  const totalIn = entries.reduce((sum: number, m: any) => sum + m.quantity, 0)
  const totalOut = exits.reduce((sum: number, m: any) => sum + Math.abs(m.quantity), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Movimientos de Inventario</h1>
        <p className="text-muted-foreground">
          Historial de entradas, salidas y ajustes de stock — {monthName(month)} {year}
        </p>
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
                <p className="text-lg sm:text-xl font-bold truncate">{safeTotal}</p>
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
                <p className="text-lg sm:text-xl font-bold truncate">
                  {movements.filter((m: any) => m.type === 'adjustment').length}
                </p>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Ajustes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MovementsListClient
        initialMovements={movements}
        totalCount={safeTotal}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        year={year}
        month={month}
      />
    </div>
  )
}
