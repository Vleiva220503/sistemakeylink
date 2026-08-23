'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { DollarSign, Search, RotateCcw, Calendar, Landmark, ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ExportButton } from '@/components/shared/export-button'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface CashRegister {
  id: string
  name: string
}

interface Cashier {
  id: string
  full_name: string | null
}

interface CashReportClientProps {
  initialMovements: any[]
  registers: CashRegister[]
  cashiers: Cashier[]
  startDate: string
  endDate: string
}

const CASH_MOVEMENT_TYPES_TRANSLATE: Record<string, string> = {
  sale: 'Venta (Efectivo)',
  expense: 'Gasto Registrado',
  income: 'Ingreso Manual',
  adjustment: 'Ajuste / Anulación',
}

export function CashReportClient({
  initialMovements,
  registers,
  cashiers,
  startDate,
  endDate,
}: CashReportClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [dateStart, setDateStart] = useState(startDate)
  const [dateEnd, setDateEnd] = useState(endDate)

  const [registerFilter, setRegisterFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [cashierFilter, setCashierFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Sync date changes with URL to fetch new server-side data
  const handleDateChange = (start: string, end: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('startDate', start)
    params.set('endDate', end)
    router.push(`${pathname}?${params.toString()}`)
  }

  const hasFilters =
    registerFilter ||
    typeFilter ||
    cashierFilter ||
    searchQuery ||
    dateStart !== startDate ||
    dateEnd !== endDate

  const filteredMovements = useMemo(() => {
    let result = [...initialMovements]

    // 1. Text Search (description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(m =>
        m.description?.toLowerCase().includes(q)
      )
    }

    // 2. Register Filter
    if (registerFilter) {
      result = result.filter(m => m.register_id === registerFilter)
    }

    // 3. Type Filter
    if (typeFilter) {
      result = result.filter(m => m.type === typeFilter)
    }

    // 4. Cashier Filter
    if (cashierFilter) {
      result = result.filter(m => m.created_by === cashierFilter)
    }

    return result
  }, [searchQuery, registerFilter, typeFilter, cashierFilter, initialMovements])

  // Aggregate metrics
  const totalSales = filteredMovements
    .filter(m => m.type === 'sale')
    .reduce((sum, m) => sum + Number(m.amount), 0)

  const totalIncomes = filteredMovements
    .filter(m => m.type === 'income' || (m.type === 'adjustment' && Number(m.amount) > 0))
    .reduce((sum, m) => sum + Number(m.amount), 0)

  const totalOutflows = filteredMovements
    .filter(m => m.type === 'expense' || Number(m.amount) < 0)
    .reduce((sum, m) => sum + Math.abs(Number(m.amount)), 0)

  const netCashFlow = filteredMovements.reduce((sum, m) => sum + Number(m.amount), 0)

  const handleResetFilters = () => {
    setSearchQuery('')
    setRegisterFilter('')
    setTypeFilter('')
    setCashierFilter('')
    const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const defaultEnd = new Date().toISOString().split('T')[0]
    setDateStart(defaultStart)
    setDateEnd(defaultEnd)
    handleDateChange(defaultStart, defaultEnd)
  }

  const handleExportExcel = async () => {
    const { exportToExcel } = await import('@/lib/export-utils')
    const rows = filteredMovements.map(m => ({
      'Fecha': new Date(m.created_at).toLocaleDateString('es-HN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      'Caja Registradora': m.cash_registers?.name || '—',
      'Tipo de Movimiento': CASH_MOVEMENT_TYPES_TRANSLATE[m.type] || m.type,
      'Monto': Number(m.amount),
      'Descripción': m.description || '—',
      'Usuario': m.usuario?.full_name || 'Sistema',
    }))

    await exportToExcel(
      rows,
      `Reporte_Movimientos_Caja_${new Date().toISOString().slice(0, 10)}.xlsx`,
      'Flujo de Caja'
    )
  }

  const handleExportPDF = async () => {
    const { exportCashMovementsPDF } = await import('@/lib/export-utils')
    const rows = filteredMovements.map(m => ({
      fecha: new Date(m.created_at).toLocaleDateString('es-HN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      }),
      caja: m.cash_registers?.name || '—',
      tipo: CASH_MOVEMENT_TYPES_TRANSLATE[m.type] || m.type,
      monto: Number(m.amount),
      descripcion: m.description || '—',
      usuario: m.usuario?.full_name || 'Sistema',
    }))

    const dateRange = `Desde ${dateStart} hasta ${dateEnd}`

    await exportCashMovementsPDF(rows, { dateRange, netChange: netCashFlow })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight uppercase">Flujo de Caja</h1>
          <p className="text-muted-foreground font-mono text-xs">
            Control analítico de ingresos, egresos y arqueos de efectivo en las cajas del sistema.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
        </div>
      </div>

      {/* Aggregate stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-display font-black text-emerald-600">{formatCurrency(totalSales)}</p>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Ventas Efectivo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                <Landmark className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-lg font-display font-black text-success">{formatCurrency(totalIncomes)}</p>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Ingresos/Ajustes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <ArrowDownRight className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-lg font-display font-black text-destructive">-{formatCurrency(totalOutflows)}</p>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Salidas/Gastos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className={`text-lg font-display font-black ${netCashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(netCashFlow)}
                </p>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Flujo Neto Caja</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters form */}
      <div className="bg-card border border-border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Date range */}
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

          {/* Search bar */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Buscar Movimiento</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Descripción del flujo..."
                className="pl-9 h-10 text-sm bg-background border-border focus-visible:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Cash Register selector */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Caja</label>
            <select
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              value={registerFilter}
              onChange={(e) => setRegisterFilter(e.target.value)}
            >
              <option value="">Todas</option>
              {registers.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Type Selector */}
          <div className="md:col-span-1 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Tipo</label>
            <select
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {Object.entries(CASH_MOVEMENT_TYPES_TRANSLATE).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Cashier Selector */}
          <div className="md:col-span-1 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Usuario</label>
            <select
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              value={cashierFilter}
              onChange={(e) => setCashierFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {cashiers.map(c => (
                <option key={c.id} value={c.id}>{c.full_name || 'Sistema'}</option>
              ))}
            </select>
          </div>

          {/* Reset button */}
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
            Flujo de Efectivo en Caja ({filteredMovements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View (< 768px) */}
          <div className="block md:hidden space-y-3">
            {filteredMovements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground font-mono text-xs bg-background/50 border border-border p-4">
                No se registraron flujos en el período seleccionado.
              </div>
            ) : (
              filteredMovements.map((m: any) => {
                const isPositive = Number(m.amount) >= 0
                return (
                  <div key={m.id} className="bg-background border border-border p-3.5 space-y-2 text-xs shadow-sm">
                    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                      <div>
                        <p className="font-semibold text-foreground">{m.cash_registers?.name || '—'}</p>
                        <p className="text-muted-foreground font-mono text-[11px]">
                          {new Date(m.created_at).toLocaleDateString('es-HN', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className={`font-mono font-bold text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>
                        {isPositive ? `+${formatCurrency(Number(m.amount))}` : `-${formatCurrency(Math.abs(Number(m.amount)))}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-muted-foreground font-mono text-[11px]">
                      <div>
                        <span className="text-foreground font-semibold">Tipo:</span> {CASH_MOVEMENT_TYPES_TRANSLATE[m.type] || m.type}
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Por:</span> {m.usuario?.full_name || 'Sistema'}
                      </div>
                    </div>
                    {m.description && (
                      <p className="text-muted-foreground italic text-[11px] border-t border-border/40 pt-1.5">
                        {m.description}
                      </p>
                    )}
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
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Fecha</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Caja</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Tipo</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-right whitespace-nowrap">Monto</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Descripción</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Registrado Por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-mono text-xs">
                      No se registraron flujos en el período seleccionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((m: any) => {
                    const isPositive = Number(m.amount) >= 0
                    return (
                      <TableRow key={m.id} className="text-xs">
                        <TableCell className="text-muted-foreground font-mono whitespace-nowrap">
                          {new Date(m.created_at).toLocaleDateString('es-HN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground whitespace-nowrap">{m.cash_registers?.name || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="font-medium text-foreground">
                            {CASH_MOVEMENT_TYPES_TRANSLATE[m.type] || m.type}
                          </span>
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold whitespace-nowrap ${isPositive ? 'text-success' : 'text-destructive'}`}>
                          {isPositive ? `+${formatCurrency(Number(m.amount))}` : `-${formatCurrency(Math.abs(Number(m.amount)))}`}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-sm truncate" title={m.description}>
                          {m.description || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{m.usuario?.full_name || 'Sistema'}</TableCell>
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
