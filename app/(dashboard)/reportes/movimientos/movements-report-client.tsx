'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Eye, RotateCcw, Search, Calendar, User, ArrowDownUp, ShieldAlert, BadgePlus, BadgeMinus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ExportButton } from '@/components/shared/export-button'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface Profile {
  id: string
  full_name: string | null
}

interface MovementsReportClientProps {
  initialMovements: any[]
  users: Profile[]
  startDate: string
  endDate: string
}

const MOVEMENT_TYPES_TRANSLATE: Record<string, string> = {
  purchase: 'Compra',
  sale: 'Venta',
  return: 'Devolución Cliente',
  supplier_return: 'Devolución Proveedor',
  damage: 'Daño/Merma',
  loss: 'Pérdida',
  adjustment: 'Ajuste Manual',
  correction: 'Corrección',
  initial: 'Inventario Inicial',
  transfer: 'Transferencia',
}

export function MovementsReportClient({
  initialMovements,
  users,
  startDate,
  endDate,
}: MovementsReportClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [dateStart, setDateStart] = useState(startDate)
  const [dateEnd, setDateEnd] = useState(endDate)

  const [typeFilter, setTypeFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Sync date changes with URL to fetch new server-side data
  const handleDateChange = (start: string, end: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('startDate', start)
    params.set('endDate', end)
    router.push(`${pathname}?${params.toString()}`)
  }

  const hasFilters =
    typeFilter ||
    userFilter ||
    searchQuery ||
    dateStart !== startDate ||
    dateEnd !== endDate

  const filteredMovements = useMemo(() => {
    let result = [...initialMovements]

    // 1. Text Search (product name or sku)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(m =>
        m.product_variants?.product?.name?.toLowerCase().includes(q) ||
        m.product_variants?.sku?.toLowerCase().includes(q)
      )
    }

    // 2. Movement Type Filter
    if (typeFilter) {
      result = result.filter(m => m.type === typeFilter)
    }

    // 3. User Filter
    if (userFilter) {
      result = result.filter(m => m.created_by === userFilter)
    }

    return result
  }, [searchQuery, typeFilter, userFilter, initialMovements])

  // Aggregate metrics
  const totalCount = filteredMovements.length
  const positiveQty = filteredMovements.filter(m => m.quantity > 0).reduce((sum, m) => sum + m.quantity, 0)
  const negativeQty = filteredMovements.filter(m => m.quantity < 0).reduce((sum, m) => sum + Math.abs(m.quantity), 0)
  const netQtyChange = positiveQty - negativeQty

  const handleResetFilters = () => {
    setSearchQuery('')
    setTypeFilter('')
    setUserFilter('')
    const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const defaultEnd = new Date().toISOString().split('T')[0]
    setDateStart(defaultStart)
    setDateEnd(defaultEnd)
    handleDateChange(defaultStart, defaultEnd)
  }

  const handleExportExcel = async () => {
    const { exportToExcel } = await import('@/lib/export-utils')
    const rows = filteredMovements.map(m => ({
      'Fecha': new Date(m.created_at).toLocaleDateString('es-NI', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      'Producto': m.product_variants?.product?.name || '—',
      'SKU': m.product_variants?.sku || '—',
      'Tipo de Movimiento': MOVEMENT_TYPES_TRANSLATE[m.type] || m.type,
      'Cantidad': m.quantity,
      'Stock Anterior': m.stock_before,
      'Stock Posterior': m.stock_after,
      'Usuario': m.usuario?.full_name || 'Sistema',
      'Notas': m.notes || '—',
    }))

    await exportToExcel(
      rows,
      `Reporte_Movimientos_Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`,
      'Movimientos'
    )
  }

  const handleExportPDF = async () => {
    const { exportInventoryMovementsPDF } = await import('@/lib/export-utils')
    const rows = filteredMovements.map(m => ({
      fecha: new Date(m.created_at).toLocaleDateString('es-NI', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      }),
      producto: m.product_variants?.product?.name || '—',
      sku: m.product_variants?.sku || '—',
      tipo: MOVEMENT_TYPES_TRANSLATE[m.type] || m.type,
      cantidad: m.quantity,
      antes: m.stock_before,
      despues: m.stock_after,
      usuario: m.usuario?.full_name || 'Sistema',
      notas: m.notes || '—',
    }))

    const dateRange = `Desde ${dateStart} hasta ${dateEnd}`

    await exportInventoryMovementsPDF(rows, { dateRange })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight uppercase">Auditoría de Movimientos</h1>
          <p className="text-muted-foreground font-mono text-xs">
            Historial de ajustes, entradas de compra, salidas de venta y mermas de inventario.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <ArrowDownUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-display font-black text-foreground">{totalCount}</p>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Movimientos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                <BadgePlus className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-display font-black text-success">+{positiveQty}</p>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Entradas (Stock)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <BadgeMinus className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-display font-black text-destructive">-{negativeQty}</p>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Salidas (Stock)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className={`text-xl font-display font-black ${netQtyChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {netQtyChange >= 0 ? `+${netQtyChange}` : netQtyChange}
                </p>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Balance Neto</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters bar */}
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
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Buscar Producto</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nombre, SKU..."
                className="pl-9 h-10 text-sm bg-background border-border focus-visible:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Movement Type */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Tipo Mov.</label>
            <select
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {Object.entries(MOVEMENT_TYPES_TRANSLATE).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Vendedor/Usuario */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Usuario</label>
            <select
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name || 'Sistema'}</option>
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
            Historial de Ajustes y Movimientos ({filteredMovements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View (< 768px) */}
          <div className="block md:hidden space-y-3">
            {filteredMovements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground font-mono text-xs bg-background/50 border border-border p-4">
                No se registraron movimientos en el período seleccionado.
              </div>
            ) : (
              filteredMovements.map((m: any) => {
                const isPositive = m.quantity > 0
                return (
                  <div key={m.id} className="bg-background border border-border p-3.5 space-y-2 text-xs shadow-sm">
                    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                      <div>
                        <p className="font-bold text-foreground">{m.product_variants?.product?.name || '—'}</p>
                        <p className="text-muted-foreground font-mono text-[11px]">
                          SKU: {m.product_variants?.sku || '—'} · {new Date(m.created_at).toLocaleDateString('es-NI', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className={`font-mono font-bold text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>
                        {isPositive ? `+${m.quantity}` : m.quantity} uds
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-muted-foreground font-mono text-[11px]">
                      <div>
                        <span className="text-foreground font-semibold">Tipo:</span> {MOVEMENT_TYPES_TRANSLATE[m.type] || m.type}
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Por:</span> {m.usuario?.full_name || 'Sistema'}
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Stock Antes:</span> {m.stock_before}
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Stock Después:</span> <span className="font-bold text-foreground">{m.stock_after}</span>
                      </div>
                    </div>
                    {m.notes && (
                      <p className="text-muted-foreground italic text-[11px] border-t border-border/40 pt-1.5">
                        {m.notes}
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
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Producto</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">SKU</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-center whitespace-nowrap">Tipo</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-center whitespace-nowrap">Cantidad</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-center whitespace-nowrap">Stock Antes</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-center whitespace-nowrap">Stock Desp.</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Usuario</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Notas/Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground font-mono text-xs">
                      No se registraron movimientos en el período seleccionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((m: any) => {
                    const isPositive = m.quantity > 0
                    return (
                      <TableRow key={m.id} className="text-xs">
                        <TableCell className="text-muted-foreground font-mono whitespace-nowrap">
                          {new Date(m.created_at).toLocaleDateString('es-NI', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground whitespace-nowrap">{m.product_variants?.product?.name || '—'}</TableCell>
                        <TableCell className="font-mono text-muted-foreground whitespace-nowrap">{m.product_variants?.sku || '—'}</TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <span className="font-medium text-foreground">
                            {MOVEMENT_TYPES_TRANSLATE[m.type] || m.type}
                          </span>
                        </TableCell>
                        <TableCell className={`text-center font-mono font-bold whitespace-nowrap ${isPositive ? 'text-success' : 'text-destructive'}`}>
                          {isPositive ? `+${m.quantity}` : m.quantity}
                        </TableCell>
                        <TableCell className="text-center font-mono text-muted-foreground whitespace-nowrap">{m.stock_before}</TableCell>
                        <TableCell className="text-center font-mono text-foreground font-semibold whitespace-nowrap">{m.stock_after}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{m.usuario?.full_name || 'Sistema'}</TableCell>
                        <TableCell className="font-serif italic text-muted-foreground max-w-xs truncate" title={m.notes}>
                          {m.notes || '—'}
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
