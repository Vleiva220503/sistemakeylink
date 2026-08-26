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

  // Load all completed sales with sale_items in date range
  const { data: salesRows } = await (supabase as any)
    .from('sales')
    .select(`
      id,
      subtotal,
      discount_amount,
      delivery_amount,
      total,
      sale_items(quantity, unit_price, unit_cost, discount_amount)
    `)
    .eq('status', 'completed')
    .gte('created_at', `${firstDayOfMonth}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)

  // Load expenses in date range
  const { data: expensesRows } = await (supabase as any)
    .from('expenses')
    .select('amount')
    .gte('expense_date', firstDayOfMonth)
    .lte('expense_date', today)

  const salesList = (salesRows as any[]) || []
  const expensesList = (expensesRows as any[]) || []

  // 1. Gross Sales = Sum of (unit_price * quantity) for all items in completed sales
  const grossSales = salesList.reduce((sum, s) => {
    const itemsGross = s.sale_items?.reduce((itemSum: number, item: any) => {
      return itemSum + Number(item.unit_price) * item.quantity
    }, 0) ?? 0
    return sum + (itemsGross > 0 ? itemsGross : Number(s.subtotal))
  }, 0)

  // 2. Discounts = Sum of item line discounts + header discount_amount
  const discounts = salesList.reduce((sum, s) => {
    const itemsDiscount = s.sale_items?.reduce((itemSum: number, item: any) => {
      return itemSum + Number(item.discount_amount ?? 0)
    }, 0) ?? 0
    const headerDiscount = Number(s.discount_amount ?? 0)
    const effectiveSaleDiscount = itemsDiscount > 0 ? itemsDiscount : headerDiscount
    return sum + effectiveSaleDiscount
  }, 0)

  // 3. Net Sales = Sum of sales.total (or Gross - Discounts + Delivery)
  const netSales = salesList.reduce((sum, s) => sum + Number(s.total), 0)

  // 4. COGS = Sum of (unit_cost * quantity)
  const cogs = salesList.reduce((sum, s) => {
    const itemsCogs = s.sale_items?.reduce((itemSum: number, item: any) => {
      return itemSum + Number(item.unit_cost ?? 0) * item.quantity
    }, 0) ?? 0
    return sum + itemsCogs
  }, 0)

  // 5. Operating Expenses
  const expenses = expensesList.reduce((sum, e) => sum + Number(e.amount), 0)

  // 6. Net Profit
  const netProfit = netSales - cogs - expenses
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
          {/* Mobile Card View (< 768px) */}
          <div className="block md:hidden space-y-3">
            <div className="bg-background border border-border p-3.5 space-y-2 text-xs shadow-sm">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="font-semibold text-success">(+) Ventas Brutas</span>
                <span className="font-mono font-bold text-foreground">{formatCurrency(grossSales)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="font-semibold text-amber-600">(-) Descuentos</span>
                <span className="font-mono text-muted-foreground">-{formatCurrency(discounts)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/50 pb-2 bg-success/5 p-2 rounded">
                <span className="font-bold text-success">(=) Ventas Netas</span>
                <span className="font-mono font-bold text-success">{formatCurrency(netSales)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="font-semibold text-muted-foreground">(-) Costo Ventas (COGS)</span>
                <span className="font-mono text-muted-foreground">-{formatCurrency(cogs)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="font-semibold text-destructive">(-) Gastos Operativos</span>
                <span className="font-mono text-destructive">-{formatCurrency(expenses)}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-sm">(=) Ganancia Neta Final</span>
                <span className={`font-mono font-bold text-base ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(netProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Concepto</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Monto</TableHead>
                  <TableHead className="text-right whitespace-nowrap">% de Ventas Netas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-success whitespace-nowrap">(+) Ventas Brutas</TableCell>
                  <TableCell className="text-right font-mono whitespace-nowrap">{formatCurrency(grossSales)}</TableCell>
                  <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                    {netSales > 0 ? `${((grossSales / netSales) * 100).toFixed(1)}%` : '—'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-amber-600 whitespace-nowrap">(-) Descuentos Otorgados</TableCell>
                  <TableCell className="text-right font-mono whitespace-nowrap">-{formatCurrency(discounts)}</TableCell>
                  <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                    {netSales > 0 ? `${((discounts / netSales) * 100).toFixed(1)}%` : '—'}
                  </TableCell>
                </TableRow>
                <TableRow className="border-t-2 font-bold">
                  <TableCell className="font-medium text-success whitespace-nowrap">(=) Ventas Netas</TableCell>
                  <TableCell className="text-right font-mono text-success whitespace-nowrap">{formatCurrency(netSales)}</TableCell>
                  <TableCell className="text-right text-muted-foreground whitespace-nowrap">100.0%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground whitespace-nowrap">(-) Costo de Ventas (COGS)</TableCell>
                  <TableCell className="text-right font-mono whitespace-nowrap">-{formatCurrency(cogs)}</TableCell>
                  <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                    {netSales > 0 ? `${((cogs / netSales) * 100).toFixed(1)}%` : '—'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-destructive whitespace-nowrap">(-) Gastos Operativos</TableCell>
                  <TableCell className="text-right font-mono text-destructive whitespace-nowrap">-{formatCurrency(expenses)}</TableCell>
                  <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                    {netSales > 0 ? `${((expenses / netSales) * 100).toFixed(1)}%` : '—'}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-secondary/20">
                  <TableCell className="font-bold font-display text-base whitespace-nowrap">(=) Ganancia Neta Final</TableCell>
                  <TableCell className={`text-right font-bold font-mono text-base whitespace-nowrap ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(netProfit)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-muted-foreground whitespace-nowrap">
                    {profitMargin.toFixed(1)}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
