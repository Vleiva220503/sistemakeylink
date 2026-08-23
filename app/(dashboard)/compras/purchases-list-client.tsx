'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShoppingBag, Calendar, Package, AlertTriangle, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'secondary' },
  ordered: { label: 'Ordenado', variant: 'outline' },
  partial: { label: 'Recibido Parcial', variant: 'outline' },
  received: { label: 'Recibido', variant: 'default' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
}

interface Purchase {
  id: string
  reference_number: string
  status: string
  order_date: string
  expected_date: string | null
  notes: string | null
  created_at: string
  supplier: {
    id: string
    name: string
  } | null
  purchase_items: Array<{
    id: string
    quantity_ordered: number
    quantity_received: number
    unit_cost: number
  }>
}

interface PurchasesListClientProps {
  initialPurchases: Purchase[]
}

export function PurchasesListClient({ initialPurchases }: PurchasesListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Date Range inputs initialized from URL params if present
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
    router.push(`/compras?${params.toString()}`)
  }

  function handleClearDates() {
    setStartDate('')
    setEndDate('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('startDate')
    params.delete('endDate')
    router.push(`/compras?${params.toString()}`)
  }

  const filteredPurchases = initialPurchases.filter((p) => {
    // 1. Text Search
    const searchLower = search.toLowerCase()
    const matchesSearch =
      p.reference_number.toLowerCase().includes(searchLower) ||
      (p.supplier?.name || '').toLowerCase().includes(searchLower)

    // 2. Status filter
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter

    return matchesSearch && matchesStatus
  })

  function formatCurrency(n: number) {
    return new Intl.NumberFormat('es', { style: 'currency', currency: 'USD' }).format(n)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Órdenes de Compra ({filteredPurchases.length})
            </CardTitle>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Reference Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar ref o proveedor..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Status Selector */}
              <Select
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val || 'all')}
              >
                <SelectTrigger className="w-full sm:w-44">
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
            </div>
          </div>

          {/* Server-side Date Range Row */}
          <div className="flex flex-wrap items-center gap-3 bg-secondary/20 p-3.5 border rounded-lg text-sm">
            <span className="font-medium text-muted-foreground shrink-0">Filtrar Fecha Orden (Server):</span>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="w-36 h-9"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-muted-foreground">a</span>
              <Input
                type="date"
                className="w-36 h-9"
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
        {filteredPurchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Package className="h-10 w-10 opacity-20" />
            <p>
              {search || statusFilter !== 'all' || startDate || endDate
                ? 'No se encontraron compras con los filtros aplicados'
                : 'No hay órdenes de compra registradas'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< 768px) */}
            <div className="block md:hidden space-y-3">
              {filteredPurchases.map((p) => {
                const status = STATUS_MAP[p.status] || {
                  label: p.status,
                  variant: 'outline' as const,
                }
                const items = p.purchase_items || []
                const orderValue = items.reduce(
                  (s, i) => s + i.quantity_ordered * i.unit_cost,
                  0
                )
                const isLate =
                  p.expected_date &&
                  new Date(p.expected_date) < new Date() &&
                  !['received', 'cancelled'].includes(p.status)

                return (
                  <div key={p.id} className="bg-background border border-border p-3.5 space-y-2.5 text-xs shadow-sm">
                    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                      <div>
                        <p className="font-mono font-bold text-foreground text-sm">{p.reference_number}</p>
                        <p className="text-muted-foreground font-mono text-[11px]">{p.supplier?.name || '—'}</p>
                      </div>
                      <Badge variant={status.variant} className="shrink-0">{status.label}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-muted-foreground font-mono text-[11px]">
                      <div>
                        <span className="text-foreground font-semibold">Orden:</span> {new Date(p.order_date).toLocaleDateString('es')}
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Ítems:</span> {items.length} uds
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Esperada:</span>{' '}
                        <span className={isLate ? 'text-destructive font-bold' : ''}>
                          {p.expected_date ? new Date(p.expected_date).toLocaleDateString('es') : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Total:</span> <span className="font-bold text-foreground">{formatCurrency(orderValue)}</span>
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
                    <TableHead className="whitespace-nowrap">Referencia</TableHead>
                    <TableHead className="whitespace-nowrap">Proveedor</TableHead>
                    <TableHead className="whitespace-nowrap">Fecha Orden</TableHead>
                    <TableHead className="whitespace-nowrap">Fecha Esperada</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Ítems</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Valor Total</TableHead>
                    <TableHead className="whitespace-nowrap">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((p) => {
                    const status = STATUS_MAP[p.status] || {
                      label: p.status,
                      variant: 'outline' as const,
                    }
                    const items = p.purchase_items || []
                    const orderValue = items.reduce(
                      (s, i) => s + i.quantity_ordered * i.unit_cost,
                      0
                    )
                    const isLate =
                      p.expected_date &&
                      new Date(p.expected_date) < new Date() &&
                      !['received', 'cancelled'].includes(p.status)
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs font-semibold whitespace-nowrap">
                          {p.reference_number}
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {p.supplier?.name || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(p.order_date).toLocaleDateString('es')}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {p.expected_date ? (
                            <div
                              className={`flex items-center gap-1 ${
                                isLate ? 'text-destructive' : 'text-muted-foreground'
                              }`}
                            >
                              {isLate && <AlertTriangle className="h-3 w-3" />}
                              <Calendar className="h-3 w-3" />
                              {new Date(p.expected_date).toLocaleDateString('es')}
                            </div>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            {items.length}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold whitespace-nowrap">
                          {formatCurrency(orderValue)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
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
