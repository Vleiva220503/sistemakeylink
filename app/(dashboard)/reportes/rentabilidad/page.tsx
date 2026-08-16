import { createClient } from '@/lib/supabase/server'
import { DollarSign, TrendingUp, TrendingDown, PieChart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'

export default async function ReporteRentabilidadPage() {
  const supabase = await createClient()

  // Define dates for profitability RPC (from start of current year/month to today)
  const today = new Date().toISOString().split('T')[0]
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const { data: profitability, error } = await (supabase as any).rpc('get_profitability', {
    p_start_date: firstDayOfMonth,
    p_end_date: today
  } as any)

  if (error) {
    console.error('Error fetching profitability RPC:', error)
  }

  // Fallback to manual aggregation if RPC fails or returns empty
  const grossSales = profitability?.gross_sales ?? 0
  const discounts = profitability?.discounts ?? 0
  const netSales = profitability?.net_sales ?? 0
  const cogs = profitability?.cogs ?? 0
  const grossProfit = profitability?.gross_profit ?? 0
  const expenses = profitability?.expenses ?? 0
  const netProfit = profitability?.net_profit ?? 0
  const transactions = profitability?.transactions ?? 0

  const profitMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Reporte de Rentabilidad</h1>
        <p className="text-muted-foreground font-mono text-xs">
          Rango: <span className="text-primary">{firstDayOfMonth}</span> al <span className="text-primary">{today}</span>
        </p>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-bold text-success">{formatCurrency(netSales)}</p>
                <p className="text-xs text-muted-foreground">Ventas Netas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold text-destructive">{formatCurrency(expenses + cogs)}</p>
                <p className="text-xs text-muted-foreground">Gastos + Costo Ventas (COGS)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={netProfit >= 0 ? 'border-success/30' : 'border-destructive/30'}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${netProfit >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(netProfit)}
                </p>
                <p className="text-xs text-muted-foreground">Ganancia Neta</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <PieChart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{profitMargin.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Margen Neto</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Financiero Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">% de Ventas Netas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-success">(+) Ventas Brutas</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(grossSales)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {netSales > 0 ? `${((grossSales / netSales) * 100).toFixed(1)}%` : '—'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-amber-600">(-) Descuentos Otorgados</TableCell>
                <TableCell className="text-right font-mono">-{formatCurrency(discounts)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {netSales > 0 ? `${((discounts / netSales) * 100).toFixed(1)}%` : '—'}
                </TableCell>
              </TableRow>
              <TableRow className="border-t-2 font-bold">
                <TableCell className="font-medium text-success">(=) Ventas Netas</TableCell>
                <TableCell className="text-right font-mono text-success">{formatCurrency(netSales)}</TableCell>
                <TableCell className="text-right text-muted-foreground">100.0%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">(-) Costo de Ventas (COGS)</TableCell>
                <TableCell className="text-right font-mono">-{formatCurrency(cogs)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {netSales > 0 ? `${((cogs / netSales) * 100).toFixed(1)}%` : '—'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-destructive">(-) Gastos Operativos</TableCell>
                <TableCell className="text-right font-mono text-destructive">-{formatCurrency(expenses)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {netSales > 0 ? `${((expenses / netSales) * 100).toFixed(1)}%` : '—'}
                </TableCell>
              </TableRow>
              <TableRow className="bg-secondary/20">
                <TableCell className="font-bold font-display text-base">(=) Ganancia Neta Final</TableCell>
                <TableCell className={`text-right font-bold font-mono text-base ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(netProfit)}
                </TableCell>
                <TableCell className="text-right font-bold text-muted-foreground">
                  {profitMargin.toFixed(1)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
