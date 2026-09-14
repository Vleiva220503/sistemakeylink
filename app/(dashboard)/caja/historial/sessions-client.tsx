'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Calendar,
  LockOpen,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Banknote,
  CreditCard,
  Smartphone,
  ArrowLeftRight,
  Package,
  StickyNote,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ExportButton } from '@/components/shared/export-button'
import { formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionRow {
  id: string
  register_id: string
  opened_at: string | null
  closed_at: string | null
  initial_amount: number
  expected_cash: number
  counted_cash: number
  difference: number | null
  total_sales_count: number
  total_sales_amount: number
  total_cash: number
  total_card: number
  total_transfer: number
  total_mobile: number
  total_other: number
  notes: string | null
  register: { name: string } | null
  opener: { id: string; full_name: string } | null
  closer: { id: string; full_name: string } | null
}

interface SessionsClientProps {
  sessions: SessionRow[]
  registers: { id: string; name: string }[]
  startDate: string
  endDate: string
  registerId: string
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-NI', {
    timeZone: 'America/Managua',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtDateShort(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-NI', {
    timeZone: 'America/Managua',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SessionsClient({
  sessions,
  registers,
  startDate: initialStart,
  endDate: initialEnd,
  registerId: initialRegister,
}: SessionsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [startDate, setStartDate] = useState(initialStart)
  const [endDate, setEndDate] = useState(initialEnd)
  const [registerFilter, setRegisterFilter] = useState(initialRegister || 'all')
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null)

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalCierres = sessions.length
  const totalVentas = sessions.reduce((s, r) => s + Number(r.total_sales_amount || 0), 0)
  const conDescuadre = sessions.filter((r) => r.difference !== null && Number(r.difference) !== 0).length
  const descuadreTotal = sessions.reduce((s, r) => s + Number(r.difference || 0), 0)

  // ── Filter navigation (server-side) ───────────────────────────────────────
  function navigate(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    const next = { startDate, endDate, registerId: registerFilter, ...overrides }
    if (next.startDate) params.set('startDate', next.startDate)
    else params.delete('startDate')
    if (next.endDate) params.set('endDate', next.endDate)
    else params.delete('endDate')
    if (next.registerId && next.registerId !== 'all') params.set('registerId', next.registerId)
    else params.delete('registerId')
    router.push(`/caja/historial?${params.toString()}`)
  }

  function handleApplyFilter() {
    navigate({ startDate, endDate, registerId: registerFilter })
  }

  function handleClearDates() {
    setStartDate('')
    setEndDate('')
    setRegisterFilter('all')
    navigate({ startDate: '', endDate: '', registerId: 'all' })
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    const { exportToExcel } = await import('@/lib/export-utils')
    const rows = sessions.map((s) => ({
      'Fecha Cierre': fmtDate(s.closed_at),
      'Fecha Apertura': fmtDate(s.opened_at),
      Caja: s.register?.name || '—',
      Abrió: s.opener?.full_name || 'Desconocido',
      Cerró: s.closer?.full_name || 'Desconocido',
      'N° Ventas': s.total_sales_count,
      'Total Ventas': Number(s.total_sales_amount),
      'Fondo Inicial': Number(s.initial_amount),
      Esperado: Number(s.expected_cash),
      Contado: Number(s.counted_cash),
      Descuadre: Number(s.difference ?? 0),
      Efectivo: Number(s.total_cash),
      Tarjeta: Number(s.total_card),
      Transferencia: Number(s.total_transfer),
      'Pago Móvil': Number(s.total_mobile),
      Otro: Number(s.total_other),
      Notas: s.notes || '—',
    }))
    await exportToExcel(rows, `Cierres_Caja_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Cierres')
  }

  const handleExportPDF = async () => {
    const { exportSessionHistoryPDF } = await import('@/lib/export-utils')
    const dateRange =
      initialStart && initialEnd
        ? `${initialStart} al ${initialEnd}`
        : initialStart
          ? `Desde ${initialStart}`
          : initialEnd
            ? `Hasta ${initialEnd}`
            : 'Todo el historial'
    await exportSessionHistoryPDF(sessions, { dateRange, totalVentas, totalCierres, conDescuadre, descuadreTotal })
  }

  // ── Row rendering helpers ─────────────────────────────────────────────────
  function DifferenceCell({ difference }: { difference: number | null }) {
    if (difference === null) return <span className="text-muted-foreground">—</span>
    const diff = Number(difference)
    if (diff === 0)
      return (
        <Badge variant="default" className="bg-success/10 text-success border border-success/30 font-mono gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {formatCurrency(0)}
        </Badge>
      )
    if (diff < 0)
      return (
        <Badge variant="destructive" className="font-mono gap-1">
          <AlertTriangle className="h-3 w-3" />
          {formatCurrency(diff)}
        </Badge>
      )
    return (
      <Badge variant="outline" className="text-success border-success bg-success/10 font-mono gap-1">
        +{formatCurrency(diff)}
      </Badge>
    )
  }

  function UserCell({ session }: { session: SessionRow }) {
    const sameUser = session.opener?.id && session.closer?.id && session.opener.id === session.closer.id
    if (sameUser) {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm">{session.opener?.full_name || 'Desconocido'}</span>
          <span className="text-[10px] text-muted-foreground italic">(mismo usuario)</span>
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs">
          <LockOpen className="h-3 w-3 text-success shrink-0" />
          <span>{session.opener?.full_name || 'Desconocido'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" />
          <span>{session.closer?.full_name || 'Desconocido'}</span>
        </div>
      </div>
    )
  }

  function rowDiscrepancyClass(difference: number | null) {
    if (difference === null || Number(difference) === 0) return ''
    return Number(difference) < 0
      ? 'border-l-2 border-l-destructive bg-destructive/[0.03]'
      : 'border-l-2 border-l-success bg-success/[0.03]'
  }

  // ── Detail Sheet ──────────────────────────────────────────────────────────
  function DetailSheet() {
    const s = selectedSession
    if (!s) return null

    const diff = Number(s.difference ?? 0)
    const sameUser = s.opener?.id && s.closer?.id && s.opener.id === s.closer.id

    const paymentMethods = [
      { label: 'Efectivo', value: s.total_cash, icon: Banknote, color: 'text-success' },
      { label: 'Tarjeta', value: s.total_card, icon: CreditCard, color: 'text-blue-500' },
      { label: 'Transferencia', value: s.total_transfer, icon: ArrowLeftRight, color: 'text-violet-500' },
      { label: 'Pago Móvil', value: s.total_mobile, icon: Smartphone, color: 'text-amber-500' },
      { label: 'Otro', value: s.total_other, icon: Package, color: 'text-muted-foreground' },
    ].filter((m) => Number(m.value) > 0)

    return (
      <Sheet open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <SheetContent
          side="right"
          className="flex flex-col p-0 sm:max-w-md"
          showCloseButton={true}
        >
          {/* Fixed header — never scrolls */}
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <div className="flex items-start gap-3 pr-6">
              <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${diff === 0 ? 'bg-success/10' : diff < 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
                <FileText className={`h-4 w-4 ${diff === 0 ? 'text-success' : diff < 0 ? 'text-destructive' : 'text-success'}`} />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-base font-semibold leading-tight">
                  {s.register?.name || 'Caja'}
                </SheetTitle>
                <SheetDescription className="mt-0.5 text-xs">
                  Cierre: {fmtDate(s.closed_at)}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable body — safe scroll pattern */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* Discrepancy banner */}
            {diff !== 0 && (
              <div className={`flex items-center gap-3 p-3.5 rounded-lg border ${diff < 0 ? 'bg-destructive/5 border-destructive/20' : 'bg-success/5 border-success/20'}`}>
                <AlertTriangle className={`h-4 w-4 shrink-0 ${diff < 0 ? 'text-destructive' : 'text-success'}`} />
                <div className="text-sm">
                  <p className={`font-semibold ${diff < 0 ? 'text-destructive' : 'text-success'}`}>
                    {diff < 0 ? 'Descuadre negativo' : 'Descuadre positivo'}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {diff < 0
                      ? `Faltan ${formatCurrency(Math.abs(diff))} en la caja`
                      : `Sobran ${formatCurrency(diff)} en la caja`}
                  </p>
                </div>
              </div>
            )}

            {/* Cash summary grid */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                Resumen de Caja
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Fondo Inicial', value: s.initial_amount },
                  { label: 'Ventas Totales', value: s.total_sales_amount },
                  { label: 'Efectivo Esperado', value: s.expected_cash, bold: true },
                  { label: 'Efectivo Contado', value: s.counted_cash, bold: true },
                ].map((item) => (
                  <div key={item.label} className="bg-secondary/30 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">{item.label}</p>
                    <p className={`text-sm font-mono ${item.bold ? 'font-bold' : 'font-medium'}`}>
                      {formatCurrency(Number(item.value))}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-2 bg-secondary/30 rounded-lg p-3 flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">Descuadre</p>
                <DifferenceCell difference={s.difference} />
              </div>
            </div>

            {/* Ventas summary */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                Ventas del Turno
              </p>
              <div className="bg-secondary/30 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground">Transacciones</p>
                  <p className="text-sm font-bold">{s.total_sales_count} venta{s.total_sales_count !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Monto Total</p>
                  <p className="text-sm font-bold font-mono text-success">{formatCurrency(Number(s.total_sales_amount))}</p>
                </div>
              </div>
            </div>

            {/* Payment breakdown */}
            {paymentMethods.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  Desglose por Método de Pago
                </p>
                <div className="space-y-2">
                  {paymentMethods.map((m) => (
                    <div key={m.label} className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                        <span className="text-sm">{m.label}</span>
                      </div>
                      <span className="text-sm font-mono font-semibold">{formatCurrency(Number(m.value))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                Usuarios del Turno
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2.5">
                  <LockOpen className="h-3.5 w-3.5 text-success shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Apertura</p>
                    <p className="text-sm font-medium">{s.opener?.full_name || 'Desconocido'}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{fmtDate(s.opened_at)}</p>
                  </div>
                </div>
                {sameUser ? (
                  <div className="px-3 py-1.5 text-center">
                    <span className="text-[10px] text-muted-foreground italic flex items-center justify-center gap-1">
                      <Users className="h-3 w-3" />
                      Mismo usuario realizó apertura y cierre
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2.5">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Cierre</p>
                      <p className="text-sm font-medium">{s.closer?.full_name || 'Desconocido'}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{fmtDate(s.closed_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {s.notes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  Notas del Cierre
                </p>
                <div className="flex items-start gap-2 bg-secondary/30 rounded-lg p-3">
                  <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">{s.notes}</p>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  const hasActiveFilters = !!(initialStart || initialEnd || (initialRegister && initialRegister !== 'all'))

  return (
    <>
      <DetailSheet />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Cierres Registrados ({sessions.length})
              </CardTitle>
              <ExportButton onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3 bg-secondary/20 p-3.5 border rounded-lg text-sm">
              <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Desde
                </label>
                <Input
                  type="date"
                  className="h-9 w-full"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Hasta
                </label>
                <Input
                  type="date"
                  className="h-9 w-full"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1 min-w-[150px]">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Caja
                </label>
                <Select value={registerFilter} onValueChange={(v) => setRegisterFilter(v || 'all')}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Todas las cajas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las cajas</SelectItem>
                    {registers.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button size="sm" className="h-9" onClick={handleApplyFilter}>
                  Aplicar
                </Button>
                {hasActiveFilters && (
                  <Button size="sm" variant="ghost" className="h-9" onClick={handleClearDates}>
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <FileText className="h-10 w-10 opacity-20" />
              <p>
                {hasActiveFilters
                  ? 'No se encontraron cierres con los filtros aplicados'
                  : 'No hay cierres registrados aún'}
              </p>
            </div>
          ) : (
            <>
              {/* ── Mobile Card View (<768px) ─────────────────────────────── */}
              <div className="block md:hidden space-y-3">
                {sessions.map((s) => {
                  const diff = Number(s.difference ?? 0)
                  const hasDiscrepancy = diff !== 0
                  return (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedSession(s)}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedSession(s)}
                      className={`bg-background border border-border p-3.5 space-y-3 text-xs shadow-sm cursor-pointer hover:bg-accent/30 transition-colors rounded-sm ${hasDiscrepancy && diff < 0 ? 'border-l-2 border-l-destructive' : hasDiscrepancy ? 'border-l-2 border-l-success' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                        <div>
                          <p className="font-semibold text-sm">{s.register?.name || 'Caja'}</p>
                          <p className="text-muted-foreground font-mono text-[11px] mt-0.5">
                            {fmtDate(s.closed_at)}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <DifferenceCell difference={s.difference} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px]">
                        <div>
                          <span className="text-muted-foreground">Ventas:</span>{' '}
                          <span className="font-semibold">{s.total_sales_count} vtas</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Monto:</span>{' '}
                          <span className="font-semibold text-success">{formatCurrency(Number(s.total_sales_amount))}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Esperado:</span>{' '}
                          <span className="font-semibold">{formatCurrency(Number(s.expected_cash))}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Contado:</span>{' '}
                          <span className="font-semibold">{formatCurrency(Number(s.counted_cash))}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>Toca para ver detalle</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── Desktop Table View (≥768px) ───────────────────────────── */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Fecha Cierre</TableHead>
                      <TableHead className="whitespace-nowrap">Caja</TableHead>
                      <TableHead className="whitespace-nowrap">Usuario</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Ventas</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Fondo</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Esperado</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Contado</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Descuadre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => (
                      <TableRow
                        key={s.id}
                        className={`cursor-pointer hover:bg-accent/40 transition-colors ${rowDiscrepancyClass(s.difference)}`}
                        onClick={() => setSelectedSession(s)}
                      >
                        {/* Fecha Cierre */}
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm">{fmtDateShort(s.closed_at)}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {s.closed_at
                                ? new Date(s.closed_at).toLocaleTimeString('es-NI', {
                                    timeZone: 'America/Managua',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </span>
                          </div>
                        </TableCell>

                        {/* Caja */}
                        <TableCell className="font-medium whitespace-nowrap">
                          {s.register?.name || '—'}
                        </TableCell>

                        {/* Usuario */}
                        <TableCell className="whitespace-nowrap">
                          <UserCell session={s} />
                        </TableCell>

                        {/* Ventas */}
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs text-muted-foreground">{s.total_sales_count} vtas</span>
                            <span className="font-bold font-mono text-success text-sm">
                              {formatCurrency(Number(s.total_sales_amount))}
                            </span>
                          </div>
                        </TableCell>

                        {/* Fondo */}
                        <TableCell className="text-right text-muted-foreground font-mono whitespace-nowrap">
                          {formatCurrency(Number(s.initial_amount))}
                        </TableCell>

                        {/* Esperado */}
                        <TableCell className="text-right font-mono font-medium whitespace-nowrap">
                          {formatCurrency(Number(s.expected_cash))}
                        </TableCell>

                        {/* Contado */}
                        <TableCell className="text-right font-mono font-medium whitespace-nowrap">
                          {formatCurrency(Number(s.counted_cash))}
                        </TableCell>

                        {/* Descuadre */}
                        <TableCell className="text-right whitespace-nowrap">
                          <DifferenceCell difference={s.difference} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}
