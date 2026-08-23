'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Activity, ArrowUpCircle, ArrowDownCircle, RefreshCw, Calendar, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const MOVEMENT_TYPES: Record<string, { label: string; color: string; icon: any }> = {
  purchase: { label: 'Compra', color: 'text-success', icon: ArrowUpCircle },
  sale: { label: 'Venta', color: 'text-destructive', icon: ArrowDownCircle },
  return: { label: 'Devolución', color: 'text-primary', icon: RefreshCw },
  adjustment: { label: 'Ajuste', color: 'text-warning', icon: Activity },
  transfer: { label: 'Transferencia', color: 'text-muted-foreground', icon: Activity },
}

interface Movement {
  id: string
  type: string
  quantity: number
  stock_before: number
  stock_after: number
  reference_type: string | null
  notes: string | null
  created_at: string
  variant: {
    sku: string
    size: string | null
    color: string | null
    product: {
      name: string
      category?: { name: string } | null
    } | null
  } | null
}

interface MovementsListClientProps {
  initialMovements: Movement[]
}

export function MovementsListClient({ initialMovements }: MovementsListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Date range server-side filters
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
    router.push(`/inventario/movimientos?${params.toString()}`)
  }

  function handleClearDates() {
    setStartDate('')
    setEndDate('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('startDate')
    params.delete('endDate')
    router.push(`/inventario/movimientos?${params.toString()}`)
  }

  const filteredMovements = initialMovements.filter((m) => {
    // 1. Text search
    const searchLower = search.toLowerCase()
    const matchesSearch =
      (m.variant?.product?.name || '').toLowerCase().includes(searchLower) ||
      (m.variant?.sku || '').toLowerCase().includes(searchLower) ||
      (m.notes || '').toLowerCase().includes(searchLower)

    // 2. Type filter
    const matchesType = typeFilter === 'all' || m.type === typeFilter

    return matchesSearch && matchesType
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Registro de Movimientos ({filteredMovements.length})
            </CardTitle>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Search bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar SKU, calzado..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Type filter */}
              <Select
                value={typeFilter}
                onValueChange={(val) => setTypeFilter(val || 'all')}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {Object.entries(MOVEMENT_TYPES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date range filter server-side */}
          <div className="flex flex-wrap items-center gap-3 bg-secondary/20 p-3.5 border rounded-lg text-sm">
            <span className="font-medium text-muted-foreground shrink-0">Filtrar Fecha Movimiento (Server):</span>
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
        {filteredMovements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Activity className="h-10 w-10 opacity-20" />
            <p>
              {search || typeFilter !== 'all' || startDate || endDate
                ? 'No se encontraron movimientos con los filtros aplicados'
                : 'No hay movimientos registrados'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< 768px) */}
            <div className="block md:hidden space-y-3">
              {filteredMovements.map((m) => {
                const mType = MOVEMENT_TYPES[m.type] || {
                  label: m.type,
                  color: 'text-foreground',
                  icon: Activity,
                }
                const Icon = mType.icon
                const isPositive = m.quantity > 0

                return (
                  <div key={m.id} className="bg-background border border-border p-3.5 space-y-2.5 text-xs shadow-sm">
                    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                      <div>
                        <p className="font-bold text-foreground text-sm">{m.variant?.product?.name || '—'}</p>
                        <p className="text-muted-foreground font-mono text-[11px]">
                          SKU: {m.variant?.sku} · {new Date(m.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1 font-bold text-xs shrink-0 ${mType.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {mType.label}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-muted-foreground font-mono text-[11px]">
                      <div>
                        <span className="text-foreground font-semibold">Talla:</span> {m.variant?.product?.category?.name || '—'}
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Cantidad:</span>{' '}
                        <span className={`font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                          {isPositive ? `+${m.quantity}` : m.quantity} uds
                        </span>
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Stock Antes:</span> {m.stock_before}
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Stock Desp:</span> <span className="font-bold text-foreground">{m.stock_after}</span>
                      </div>
                    </div>

                    {m.notes && (
                      <p className="text-muted-foreground italic text-[11px] border-t border-border/40 pt-1.5">
                        {m.notes}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Fecha</TableHead>
                    <TableHead className="whitespace-nowrap">Tipo</TableHead>
                    <TableHead className="whitespace-nowrap">Producto / Variante</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Cantidad</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Stock Anterior</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Stock Posterior</TableHead>
                    <TableHead className="whitespace-nowrap">Referencia</TableHead>
                    <TableHead className="whitespace-nowrap">Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((m) => {
                    const mType = MOVEMENT_TYPES[m.type] || {
                      label: m.type,
                      color: 'text-foreground',
                      icon: Activity,
                    }
                    const Icon = mType.icon
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1 font-mono">
                            <Calendar className="h-3 w-3" />
                            {new Date(m.created_at).toLocaleDateString('es', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div
                            className={`flex items-center gap-1.5 font-medium ${mType.color}`}
                          >
                            <Icon className="h-4 w-4" />
                            {mType.label}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div>
                            <p className="font-medium text-sm">
                              {m.variant?.product?.name || '—'}
                              {m.variant?.product?.category?.name && (
                                <span className="text-xs font-bold text-primary ml-1.5">
                                  (Talla: {m.variant.product.category.name})
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {m.variant?.sku}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap font-mono">
                          <span
                            className={`font-bold text-sm ${
                              m.quantity > 0 ? 'text-success' : 'text-destructive'
                            }`}
                          >
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground font-mono whitespace-nowrap">
                          {m.stock_before}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-sm font-mono whitespace-nowrap">
                          {m.stock_after}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize whitespace-nowrap">
                          {m.reference_type || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate whitespace-nowrap">
                          {m.notes || '—'}
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
