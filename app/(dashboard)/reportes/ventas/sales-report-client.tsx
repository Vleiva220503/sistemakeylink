'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { DollarSign, ShoppingCart, TrendingUp, Calendar, Search, RotateCcw, User, CreditCard } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ExportButton } from '@/components/shared/export-button'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Cashier {
  id: string
  full_name: string | null
}

interface SalesReportClientProps {
  initialSales: any[]
  cashiers: Cashier[]
  startDate: string
  endDate: string
}

type PaymentFilter = 'all' | 'cash' | 'card'
type StatusFilter = 'all' | 'completed' | 'cancelled'

export function SalesReportClient({
  initialSales,
  cashiers,
  startDate,
  endDate,
}: SalesReportClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [dateStart, setDateStart] = useState(startDate)
  const [dateEnd, setDateEnd] = useState(endDate)

  const [cashierFilter, setCashierFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [isMounted, setIsMounted] = useState(false)
  const [chartKey, setChartKey] = useState(0)

  useEffect(() => {
    setIsMounted(true)

    // Force chart re-mount on focus/visibility change to clear stuck tooltips/drag states
    const handleReset = () => {
      setChartKey(k => k + 1)
    }
    window.addEventListener('focus', handleReset)
    document.addEventListener('visibilitychange', handleReset)
    return () => {
      window.removeEventListener('focus', handleReset)
      document.removeEventListener('visibilitychange', handleReset)
    }
  }, [])

  // Sync date changes with URL to fetch new server-side data
  const handleDateChange = (start: string, end: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('startDate', start)
    params.set('endDate', end)
    router.push(`${pathname}?${params.toString()}`)
  }

  const hasFilters =
    cashierFilter ||
    paymentFilter !== 'all' ||
    statusFilter !== 'all' ||
    searchQuery ||
    dateStart !== startDate ||
    dateEnd !== endDate

  const filteredSales = useMemo(() => {
    let result = [...initialSales]

    // 1. Text Search (sale number or customer)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s =>
        s.sale_number?.toLowerCase().includes(q) ||
        s.customer?.name?.toLowerCase().includes(q)
      )
    }

    // 2. Cashier Filter
    if (cashierFilter) {
      result = result.filter(s => s.created_by === cashierFilter)
    }

    // 3. Payment Method Filter
    if (paymentFilter !== 'all') {
      result = result.filter(s => {
        const hasPaymentMethod = s.payments?.some((p: any) => p.method === paymentFilter)
        // Default to cash if no payments array exists
        if (!s.payments || s.payments.length === 0) return paymentFilter === 'cash'
        return hasPaymentMethod
      })
    }

    // 4. Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(s => s.status === statusFilter)
    }

    return result
  }, [searchQuery, cashierFilter, paymentFilter, statusFilter, initialSales])

  // Dynamic KPI Aggregation
  const completedSales = filteredSales.filter(s => s.status === 'completed')
  const totalRevenue = completedSales.reduce((sum, s) => sum + Number(s.total), 0)
  const totalDiscount = completedSales.reduce((sum, s) => sum + Number(s.discount_amount), 0)
  const avgTicket = completedSales.length > 0 ? totalRevenue / completedSales.length : 0

  // Payment Breakdown
  const cashTotal = completedSales.reduce((sum, s) => {
    const pSum = s.payments?.filter((p: any) => p.method === 'cash').reduce((acc: number, p: any) => acc + Number(p.amount), 0) ?? 0
    // If no payments, count total as cash
    if (!s.payments || s.payments.length === 0) return sum + Number(s.total)
    return sum + pSum
  }, 0)

  const cardTotal = completedSales.reduce((sum, s) => {
    const pSum = s.payments?.filter((p: any) => p.method === 'card').reduce((acc: number, p: any) => acc + Number(p.amount), 0) ?? 0
    return sum + pSum
  }, 0)

  // Daily Sales trend for Recharts
  const chartData = useMemo(() => {
    const dailyMap: Record<string, number> = {}

    // Initialize date map for empty days in range
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    const temp = new Date(start)
    while (temp <= end) {
      const dateStr = temp.toISOString().split('T')[0]
      dailyMap[dateStr] = 0
      temp.setDate(temp.getDate() + 1)
    }

    // Populate data
    filteredSales.forEach(s => {
      if (s.status === 'completed') {
        const dateStr = new Date(s.created_at).toISOString().split('T')[0]
        if (dailyMap[dateStr] !== undefined) {
          dailyMap[dateStr] += Number(s.total)
        }
      }
    })

    return Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, total]) => ({
        date: new Date(date + 'T00:00:00').toLocaleDateString('es-HN', { day: 'numeric', month: 'short' }),
        Ventas: total,
      }))
  }, [filteredSales, startDate, endDate])

  const handleResetFilters = () => {
    setSearchQuery('')
    setCashierFilter('')
    setPaymentFilter('all')
    setStatusFilter('all')
    // Reset date in client and reload URL params
    const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const defaultEnd = new Date().toISOString().split('T')[0]
    setDateStart(defaultStart)
    setDateEnd(defaultEnd)
    handleDateChange(defaultStart, defaultEnd)
  }

   const handleExportExcel = async () => {
    const { exportToExcel } = await import('@/lib/export-utils')
    const rows = filteredSales.map(s => ({
      'N° Venta': s.sale_number,
      'Fecha': new Date(s.created_at).toLocaleDateString('es-NI', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      'Cajero': s.cajero?.full_name || 'Cajero',
      'Cliente': s.customer?.name || 'Cliente General',
      'Caja': s.register?.name || '—',
      'Talla': Array.from(new Set(s.sale_items?.map((item: any) => item.variant?.product?.category?.name).filter(Boolean))).join(', ') || '—',
      'Desc. Talla': Array.from(new Set(s.sale_items?.map((item: any) => item.variant?.product?.category?.description).filter(Boolean))).join(', ') || '—',
      'Subtotal': Number(s.subtotal),
      'Descuento': Number(s.discount_amount),
      'Delivery': Number(s.delivery_amount || 0),
      'Total': Number(s.total),
      'Método de Pago': s.payments && s.payments.length > 0
        ? s.payments.map((p: any) => p.method === 'cash' ? 'Efectivo' : 'Tarjeta').join(' + ')
        : 'Efectivo',
      'Estado': s.status === 'completed' ? 'Completada' : s.status === 'cancelled' ? 'Anulada' : s.status,
    }))

    await exportToExcel(
      rows,
      `Reporte_Ventas_${new Date().toISOString().slice(0, 10)}.xlsx`,
      'Ventas'
    )
  }

  const handleExportPDF = async () => {
    const { exportSalesPDF } = await import('@/lib/export-utils')
    const rows = filteredSales.map(s => ({
      'N° venta': s.sale_number,
      fecha: new Date(s.created_at).toLocaleDateString('es-NI', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      }),
      cajero: s.cajero?.full_name || 'Cajero',
      cliente: s.customer?.name || 'Cliente General',
      talla: Array.from(new Set(s.sale_items?.map((item: any) => item.variant?.product?.category?.name).filter(Boolean))).join(', ') || '—',
      tallaDescription: Array.from(new Set(s.sale_items?.map((item: any) => item.variant?.product?.category?.description).filter(Boolean))).join(', ') || '—',
      subtotal: Number(s.subtotal),
      descuento: Number(s.discount_amount),
      delivery: Number(s.delivery_amount || 0),
      total: Number(s.total),
      'método de pago': s.payments && s.payments.length > 0
        ? s.payments.map((p: any) => p.method === 'cash' ? 'Efectivo' : 'Tarjeta').join(' + ')
        : 'Efectivo',
      estado: s.status === 'completed' ? 'Completada' : s.status === 'cancelled' ? 'Anulada' : s.status,
    }))

    const dateRange = `Desde ${dateStart} hasta ${dateEnd}`

    await exportSalesPDF(rows, {
      totalVentas: totalRevenue,
      cantidadVentas: completedSales.length,
      dateRange,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight uppercase">Reporte de Ventas</h1>
          <p className="text-muted-foreground font-mono text-xs">
            Análisis detallado de transacciones, métodos de pago y tendencias diarias.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
        </div>
      </div>

      {/* Overview stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-3.5 sm:pt-5 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-xl font-display font-black text-foreground truncate">{formatCurrency(totalRevenue)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-mono tracking-wider truncate">Ingresos Netos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-3.5 sm:pt-5 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-xl font-display font-black text-success truncate">{completedSales.length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-mono tracking-wider truncate">Ventas Exitosas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-3.5 sm:pt-5 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-xl font-display font-black text-warning truncate">{formatCurrency(avgTicket)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-mono tracking-wider truncate">Ticket Promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-3.5 sm:pt-5 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-xl font-display font-black text-destructive truncate">{formatCurrency(totalDiscount)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-mono tracking-wider truncate">Descuentos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment methods breakdown cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <User className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wider font-mono text-muted-foreground">Ventas en Efectivo</p>
                <p className="text-lg font-display font-black text-emerald-600">{formatCurrency(cashTotal)}</p>
              </div>
            </div>
            <div className="text-right text-xs font-mono font-bold text-muted-foreground">
              {totalRevenue > 0 ? `${((cashTotal / totalRevenue) * 100).toFixed(1)}%` : '0%'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wider font-mono text-muted-foreground">Ventas con Tarjeta</p>
                <p className="text-lg font-display font-black text-indigo-600">{formatCurrency(cardTotal)}</p>
              </div>
            </div>
            <div className="text-right text-xs font-mono font-bold text-muted-foreground">
              {totalRevenue > 0 ? `${((cardTotal / totalRevenue) * 100).toFixed(1)}%` : '0%'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart and daily sales projection */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-display font-black text-sm uppercase tracking-wide">
            Evolución Diaria de Ventas
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {isMounted ? (
            <ResponsiveContainer key={chartKey} width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  style={{ fontSize: 10, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  style={{ fontSize: 10, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(val) => `L ${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 0,
                    fontSize: 12,
                    fontFamily: 'sans-serif',
                  }}
                  formatter={(val) => [formatCurrency(Number(val)), 'Ventas']}
                />
                <Area
                  type="monotone"
                  dataKey="Ventas"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-xs">
              Cargando gráfico...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters Form */}
      <div className="bg-card border border-border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Date range inputs */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Desde</label>
            <Input
              type="date"
              className="h-10 text-sm bg-background border-border"
              value={dateStart}
              onChange={(e) => {
                setDateStart(e.target.value)
                if (e.target.value && dateEnd) handleDateChange(e.target.value, dateEnd)
              }}
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Hasta</label>
            <Input
              type="date"
              className="h-10 text-sm bg-background border-border"
              value={dateEnd}
              onChange={(e) => {
                setDateEnd(e.target.value)
                if (dateStart && e.target.value) handleDateChange(dateStart, e.target.value)
              }}
            />
          </div>

          {/* Text Search */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Buscar Venta</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="N° Venta, cliente..."
                className="pl-9 h-10 text-sm bg-background border-border focus-visible:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Cashier Selector */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Cajero</label>
            <select
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              value={cashierFilter}
              onChange={(e) => setCashierFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {cashiers.map(c => (
                <option key={c.id} value={c.id}>{c.full_name || 'Sin nombre'}</option>
              ))}
            </select>
          </div>

          {/* Payment Method Selector */}
          <div className="md:col-span-1 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Pago</label>
            <select
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
            >
              <option value="all">Todos</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
            </select>
          </div>

          {/* Status Selector */}
          <div className="md:col-span-1 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Estado</label>
            <select
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">Todos</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Anulada</option>
            </select>
          </div>

          {/* Reset Filters button */}
          <div className="md:col-span-1">
            {hasFilters && (
              <button
                onClick={handleResetFilters}
                className="w-full h-10 text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center gap-1.5 bg-secondary/50 border border-border text-foreground hover:bg-secondary cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-display font-black text-sm uppercase tracking-wide">
            Transacciones Registradas ({filteredSales.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View (< 768px) */}
          <div className="block md:hidden space-y-3">
            {filteredSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground font-mono text-xs bg-background/50 border border-border p-4">
                No se encontraron transacciones en el período seleccionado.
              </div>
            ) : (
              filteredSales.map((s: any) => {
                const payLabel = s.payments && s.payments.length > 0
                  ? s.payments.map((p: any) => p.method === 'cash' ? 'Efectivo' : 'Tarjeta').join(' + ')
                  : 'Efectivo'
                const isCompleted = s.status === 'completed'

                return (
                  <div key={s.id} className="bg-background border border-border p-3.5 space-y-2.5 text-xs shadow-sm">
                    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                      <div>
                        <p className="font-mono font-bold text-foreground text-sm">{s.sale_number}</p>
                        <p className="text-muted-foreground font-mono text-[11px]">
                          {new Date(s.created_at).toLocaleDateString('es-NI', {
                            timeZone: 'America/Managua',
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase shrink-0 ${
                          isCompleted
                            ? 'bg-success/15 text-success'
                            : 'bg-destructive/15 text-destructive'
                        }`}
                      >
                        {isCompleted ? 'Completada' : 'Anulada'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-muted-foreground font-mono text-[11px]">
                      <div>
                        <span className="text-foreground font-semibold">Cliente:</span> {s.customer?.name || 'Cliente General'}
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Cajero:</span> {s.cajero?.full_name || 'Cajero'}
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Método:</span> {payLabel}
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Total:</span> <span className="font-bold text-foreground">{formatCurrency(Number(s.total))}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Nro. Venta</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Fecha</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Cliente</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Cajero</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-center whitespace-nowrap">Tallas</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-center whitespace-nowrap">Desc. Talla</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-right whitespace-nowrap">Subtotal</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-right whitespace-nowrap">Descuento</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-right whitespace-nowrap">Delivery</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-right whitespace-nowrap">Total</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-center whitespace-nowrap">Método</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-center whitespace-nowrap">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground font-mono text-xs">
                      No se encontraron transacciones en el período seleccionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((s: any) => {
                    const payLabel = s.payments && s.payments.length > 0
                      ? s.payments.map((p: any) => p.method === 'cash' ? 'Efectivo' : 'Tarjeta').join(' + ')
                      : 'Efectivo'

                    return (
                      <TableRow key={s.id} className="text-xs">
                        <TableCell className="font-mono font-bold text-foreground whitespace-nowrap">{s.sale_number}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1 font-mono">
                            <Calendar className="h-3 w-3" />
                            {new Date(s.created_at).toLocaleDateString('es-NI', {
                              timeZone: 'America/Managua',
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{s.customer?.name || 'Cliente General'}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{s.cajero?.full_name || 'Cajero'}</TableCell>
                        <TableCell className="text-center font-mono font-semibold whitespace-nowrap">
                          {Array.from(new Set(s.sale_items?.map((item: any) => item.variant?.product?.category?.name).filter(Boolean))).join(', ') || '—'}
                        </TableCell>
                        <TableCell className="text-center font-mono text-muted-foreground text-[10px] whitespace-nowrap">
                          {Array.from(new Set(s.sale_items?.map((item: any) => item.variant?.product?.category?.description).filter(Boolean))).join(', ') || '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap">{formatCurrency(Number(s.subtotal))}</TableCell>
                        <TableCell className="text-right font-mono text-destructive whitespace-nowrap">
                          {Number(s.discount_amount) > 0 ? `-${formatCurrency(Number(s.discount_amount))}` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground whitespace-nowrap">
                          {Number(s.delivery_amount) > 0 ? `+${formatCurrency(Number(s.delivery_amount))}` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground whitespace-nowrap">{formatCurrency(Number(s.total))}</TableCell>
                        <TableCell className="text-center font-mono font-semibold text-muted-foreground whitespace-nowrap">{payLabel}</TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                              s.status === 'completed'
                                ? 'bg-success/15 text-success'
                                : 'bg-destructive/15 text-destructive'
                            }`}
                          >
                            {s.status === 'completed' ? 'Completada' : 'Anulada'}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
