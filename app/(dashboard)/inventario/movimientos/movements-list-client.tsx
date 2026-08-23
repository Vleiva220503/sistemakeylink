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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Producto / Variante</TableHead>
                <TableHead className="text-center">Cantidad</TableHead>
                <TableHead className="text-center">Stock Anterior</TableHead>
                <TableHead className="text-center">Stock Posterior</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Notas</TableHead>
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
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
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
                    <TableCell>
                      <div
                        className={`flex items-center gap-1.5 font-medium ${mType.color}`}
                      >
                        <Icon className="h-4 w-4" />
                        {mType.label}
                      </div>
                    </TableCell>
                    <TableCell>
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
                        {(m.variant?.size || m.variant?.color) && (
                          <div className="flex gap-1 mt-0.5">
                            {m.variant?.size && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                {m.variant.size}
                              </Badge>
                            )}
                            {m.variant?.color && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                {m.variant.color}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`font-bold text-sm ${
                          m.quantity > 0 ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {m.stock_before}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-sm">
                      {m.stock_after}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">
                      {m.reference_type || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                      {m.notes || '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
