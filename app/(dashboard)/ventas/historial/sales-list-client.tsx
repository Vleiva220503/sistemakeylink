'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ShoppingCart, Calendar, Search, ShieldAlert, Trash2, Loader2, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatCurrency } from '@/lib/utils'
import { voidSale } from '@/app/actions/sales'
import { toast } from 'sonner'
import { ExportButton } from '@/components/shared/export-button'

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  completed: { label: 'Completada', variant: 'default' },
  pending: { label: 'Pendiente', variant: 'secondary' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
  partial: { label: 'Parcial', variant: 'outline' },
}

interface Sale {
  id: string
  sale_number: string
  status: string
  subtotal: number
  discount_amount: number
  delivery_amount?: number
  delivery_type?: 'own' | 'external' | null
  total: number
  amount_paid: number
  amount_pending: number
  notes: string | null
  created_at: string
  completed_at: string | null
  customer: {
    name: string
  } | null
  register: {
    name: string
  } | null
  sale_items: Array<{
    id: string
    quantity: number
    unit_price: number
    discount_amount?: number
    total: number
  }>
  payments?: Array<{
    method: string
    amount: number
  }> | null
  cajero?: {
    full_name: string
  } | null
}

interface SalesListClientProps {
  initialSales: Sale[]
  isAdmin?: boolean
}

export function SalesListClient({ initialSales, isAdmin = false }: SalesListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all')

  // Date Range inputs initialized from URL params
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '')
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '')

  function handleFilterDates() {
    const params = new URLSearchParams(searchParams.toString())
    if (startDate) {
      params.set('startDate', startDate)
    } else {
      params.delete('startDate')
    }
    if (endDate) {
      params.set('endDate', endDate)
    } else {
      params.delete('endDate')
    }
    router.push(`/ventas/historial?${params.toString()}`)
  }

  function handleClearDates() {
    setStartDate('')
    setEndDate('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('startDate')
    params.delete('endDate')
    router.push(`/ventas/historial?${params.toString()}`)
  }

  const filteredSales = initialSales.filter((s) => {
    // 1. Text Search
    const searchLower = search.toLowerCase()
    const matchesSearch =
      s.sale_number.toLowerCase().includes(searchLower) ||
      (s.customer?.name || 'cliente general').toLowerCase().includes(searchLower) ||
      (s.notes || '').toLowerCase().includes(searchLower)

    // 2. Status Filter
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter

    // 3. Delivery Filter
    let matchesDelivery = true
    if (deliveryFilter === 'own') {
      matchesDelivery = s.delivery_type === 'own' || (!s.delivery_type && Number(s.delivery_amount) > 0)
    } else if (deliveryFilter === 'external') {
      matchesDelivery = s.delivery_type === 'external'
    } else if (deliveryFilter === 'none') {
      matchesDelivery = !Number(s.delivery_amount) || Number(s.delivery_amount) === 0
    }

    return matchesSearch && matchesStatus && matchesDelivery
  })

  const handleExportExcel = async () => {
    const { exportToExcel } = await import('@/lib/export-utils')
    const rows = filteredSales.map((s) => ({
      'N° venta': s.sale_number,
      fecha: new Date(s.created_at).toLocaleDateString('es-NI', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      cajero: s.cajero?.full_name || s.register?.name || 'Cajero',
      cliente: s.customer?.name || 'Cliente General',
      subtotal: Number(s.subtotal),
      descuento: Number(s.discount_amount),
      'Tipo Envío': s.delivery_type === 'own' ? 'Envío Propio' : s.delivery_type === 'external' ? 'Envío por Tercero' : (Number(s.delivery_amount) > 0 ? 'Envío Propio' : '—'),
      delivery: Number((s as any).delivery_amount || 0),
      total: Number(s.total),
      'método de pago': s.payments && s.payments.length > 0
        ? s.payments.map((p) => p.method === 'cash' ? 'Efectivo' : 'Tarjeta').join(' + ')
        : 'Efectivo',
      estado: s.status === 'completed' ? 'Completada' : s.status === 'cancelled' ? 'Cancelada' : s.status,
    }))
    await exportToExcel(rows, `Ventas_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Ventas')
  }

  const handleExportPDF = async () => {
    const { exportSalesPDF } = await import('@/lib/export-utils')
    const rows = filteredSales.map((s) => ({
      'N° venta': s.sale_number,
      fecha: new Date(s.created_at).toLocaleDateString('es-NI', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      }),
      cajero: s.cajero?.full_name || s.register?.name || 'Cajero',
      cliente: s.customer?.name || 'Cliente General',
      talla: '—',
      tallaDescription: '',
      subtotal: Number(s.subtotal),
      descuento: Number(s.discount_amount),
      delivery: Number((s as any).delivery_amount || 0),
      total: Number(s.total),
      'método de pago': s.payments && s.payments.length > 0
        ? s.payments.map((p) => p.method === 'cash' ? 'Efectivo' : 'Tarjeta').join(' + ')
        : 'Efectivo',
      estado: s.status === 'completed' ? 'Completada' : s.status === 'cancelled' ? 'Cancelada' : s.status,
    }))

    const totalRevenue = filteredSales
      .filter((s) => s.status === 'completed')
      .reduce((sum, s) => sum + Number(s.total), 0)

    const dateRange = startDate && endDate
      ? `Desde ${startDate} hasta ${endDate}`
      : startDate
      ? `Desde ${startDate}`
      : endDate
      ? `Hasta ${endDate}`
      : 'Todo el historial'

    await exportSalesPDF(rows, {
      totalVentas: totalRevenue,
      cantidadVentas: filteredSales.length,
      dateRange,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Todas las Ventas ({filteredSales.length})
            </CardTitle>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <ExportButton onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
              {/* Reference Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar nro venta, cliente..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val || 'all')}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {Object.entries(STATUS_MAP).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Delivery Filter */}
              <Select
                value={deliveryFilter}
                onValueChange={(val) => setDeliveryFilter(val || 'all')}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Tipo Envío" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los envíos</SelectItem>
                  <SelectItem value="own">Envío Propio</SelectItem>
                  <SelectItem value="external">Envío por Tercero</SelectItem>
                  <SelectItem value="none">Sin Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date range filter server-side */}
          <div className="flex flex-wrap items-center gap-3 bg-secondary/20 p-3.5 border rounded-lg text-sm">
            <span className="font-medium text-muted-foreground shrink-0">Filtrar Fecha Venta (Server):</span>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 sm:flex-none">
              <Input
                type="date"
                className="w-full sm:w-36 h-9"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-muted-foreground">a</span>
              <Input
                type="date"
                className="w-full sm:w-36 h-9"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <Button size="sm" onClick={handleFilterDates}>
                Aplicar
              </Button>
              {(startDate || endDate) && (
                <Button size="sm" variant="ghost" onClick={handleClearDates}>
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <ShoppingCart className="h-10 w-10 opacity-20" />
            <p>
              {search || statusFilter !== 'all' || startDate || endDate
                ? 'No se encontraron ventas con los filtros aplicados'
                : 'No hay ventas registradas todavía'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< 768px) */}
            <div className="block md:hidden space-y-3">
              {filteredSales.map((s) => {
                const status = STATUS_MAP[s.status] || {
                  label: s.status,
                  variant: 'outline' as const,
                }
                const totalUnits = s.sale_items?.reduce((sum, item) => sum + item.quantity, 0) || 0

                return (
                  <div key={s.id} className={`bg-background border border-border p-3.5 space-y-2.5 text-xs shadow-sm ${s.status === 'cancelled' ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                      <div>
                        <Link
                          href={`/ventas/historial/${s.id}`}
                          className="font-mono font-bold text-primary text-sm flex items-center gap-1 hover:underline"
                        >
                          {s.sale_number}
                          <Eye className="h-3.5 w-3.5 text-primary" />
                        </Link>
                        <p className="text-muted-foreground font-mono text-[11px]">
                          {new Date(s.created_at).toLocaleDateString('es-NI', {
                            timeZone: 'America/Managua',
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>
                      <Badge variant={status.variant} className="shrink-0">{status.label}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-muted-foreground font-mono text-[11px]">
                      <div>
                        <span className="text-foreground font-semibold">Cliente:</span> {s.customer?.name || 'Cliente General'}
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Ítems:</span> {totalUnits} uds
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Caja:</span> {s.register?.name || '—'}
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Total:</span> <span className="font-bold text-foreground">{formatCurrency(Number(s.total))}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Nro. Venta</TableHead>
                    <TableHead className="whitespace-nowrap">Fecha</TableHead>
                    <TableHead className="whitespace-nowrap">Cliente</TableHead>
                    <TableHead className="whitespace-nowrap">Caja</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Ítems</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Subtotal</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Desc.</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Delivery</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Pendiente</TableHead>
                    <TableHead className="whitespace-nowrap">Estado</TableHead>
                    {isAdmin && <TableHead className="text-right whitespace-nowrap">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((s) => {
                    const status = STATUS_MAP[s.status] || {
                      label: s.status,
                      variant: 'outline' as const,
                    }
                    const itemsDiscountSum = s.sale_items?.reduce((acc, item) => acc + Number(item.discount_amount ?? 0), 0) ?? 0
                    const effectiveDiscount = itemsDiscountSum > 0 ? itemsDiscountSum : Number(s.discount_amount ?? 0)

                    return (
                      <TableRow key={s.id} className={s.status === 'cancelled' ? 'opacity-60 bg-muted/20' : ''}>
                        <TableCell className={`font-mono text-xs font-semibold whitespace-nowrap ${s.status === 'cancelled' ? 'line-through' : ''}`}>
                          <Link
                            href={`/ventas/historial/${s.id}`}
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                            title="Ver detalle de venta"
                          >
                            {s.sale_number}
                            <Eye className="h-3 w-3 opacity-40 group-hover:opacity-100" />
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1 font-mono">
                            <Calendar className="h-3 w-3" />
                            {new Date(s.created_at).toLocaleDateString('es-NI', {
                              timeZone: 'America/Managua',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {s.customer?.name || 'Cliente General'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {s.register?.name}
                        </TableCell>
                        <TableCell className="text-center text-sm font-mono whitespace-nowrap">
                          {s.sale_items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono whitespace-nowrap">
                          {formatCurrency(Number(s.subtotal))}
                        </TableCell>
                        <TableCell className="text-right text-sm text-destructive font-mono whitespace-nowrap font-semibold">
                          {effectiveDiscount > 0
                            ? `-${formatCurrency(effectiveDiscount)}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono whitespace-nowrap">
                          {Number(s.delivery_amount) > 0 ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={s.delivery_type === 'external' ? 'text-amber-600 font-bold' : 'text-muted-foreground'}>
                                +{formatCurrency(Number(s.delivery_amount))}
                              </span>
                              <Badge
                                variant={s.delivery_type === 'external' ? 'secondary' : 'default'}
                                className={`text-[9px] py-0 px-1 font-mono font-bold uppercase ${
                                  s.delivery_type === 'external' ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20' : ''
                                }`}
                              >
                                {s.delivery_type === 'external' ? 'Tercero' : 'Propio'}
                              </Badge>
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono whitespace-nowrap">
                          {formatCurrency(Number(s.total))}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono text-muted-foreground whitespace-nowrap">
                          {Number(s.amount_pending) > 0
                            ? formatCurrency(Number(s.amount_pending))
                            : '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right whitespace-nowrap">
                            {s.status !== 'cancelled' ? (
                              <AlertDialog>
                                <AlertDialogTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:bg-destructive/10"
                                      disabled={isPending}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  }
                                />
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                      <ShieldAlert className="h-5 w-5" />
                                      ¿Anular Venta {s.sale_number}?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription render={<div />} className="space-y-2 text-sm text-muted-foreground">
                                      <p>
                                        Esta acción es irreversible y realizará las siguientes operaciones:
                                      </p>
                                      <ul className="list-disc list-inside text-xs space-y-1 bg-secondary/35 p-3.5 border rounded-lg font-sans">
                                        <li>Marcará el estado de la venta como <strong>Cancelada</strong>.</li>
                                        <li>Reincorporará los {s.sale_items?.reduce((sum, item) => sum + item.quantity, 0)} pares al stock físico disponible.</li>
                                        <li>Registrará el movimiento de reversión en el historial de inventario.</li>
                                        <li>Si se pagó en efectivo, restará el monto total de la caja del día.</li>
                                      </ul>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        startTransition(async () => {
                                          const res = await voidSale(s.id)
                                          if (res?.error) {
                                            toast.error(res.error)
                                          } else {
                                            toast.success(`Venta ${s.sale_number} anulada correctamente y stock restaurado.`)
                                            router.refresh()
                                          }
                                        })
                                      }}
                                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                    >
                                      {isPending ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Anulando...
                                        </>
                                      ) : (
                                        'Anular Venta'
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Anulada</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
