'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'

interface Movement {
  id: string
  type: string
  amount: number
  description: string | null
  created_at: string
  register?: { name: string } | null
}

interface MovementsClientProps {
  movements: Movement[]
  startDate: string
  endDate: string
}

export function MovementsClient({ movements, startDate: initialStart, endDate: initialEnd }: MovementsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [startDate, setStartDate] = useState(initialStart)
  const [endDate, setEndDate] = useState(initialEnd)

  function handleApplyFilter() {
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
    router.push(`/caja?${params.toString()}`)
  }

  function handleClearDates() {
    setStartDate('')
    setEndDate('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('startDate')
    params.delete('endDate')
    router.push(`/caja?${params.toString()}`)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Movimientos Recientes ({movements.length})
            </CardTitle>
          </div>

          {/* Date range filter — mismo patrón que Historial de Ventas */}
          <div className="flex flex-wrap items-center gap-3 bg-secondary/20 p-3.5 border rounded-lg text-sm">
            <span className="font-medium text-muted-foreground shrink-0">Filtrar por Fecha:</span>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 sm:flex-none">
              <Input
                type="date"
                id="caja-date-start"
                className="w-full sm:w-36 h-9"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-muted-foreground shrink-0">a</span>
              <Input
                type="date"
                id="caja-date-end"
                className="w-full sm:w-36 h-9"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <Button id="caja-apply-filter" size="sm" onClick={handleApplyFilter}>
                Aplicar
              </Button>
              {(initialStart || initialEnd) && (
                <Button size="sm" variant="ghost" onClick={handleClearDates}>
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Activity className="h-10 w-10 opacity-20" />
            <p>
              {initialStart || initialEnd
                ? 'No hay movimientos en el rango de fechas seleccionado'
                : 'Sin movimientos registrados'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< 768px) */}
            <div className="block md:hidden space-y-3">
              {movements.map((m) => {
                const isPositive = m.type === 'sale' || m.type === 'income'
                return (
                  <div key={m.id} className="bg-background border border-border p-3.5 space-y-2.5 text-xs shadow-sm">
                    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                      <div>
                        <p className="font-bold text-foreground">{m.register?.name || 'Caja'}</p>
                        <p className="text-muted-foreground font-mono text-[11px]">
                          {new Date(m.created_at).toLocaleString('es-NI', {
                            timeZone: 'America/Managua',
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <Badge variant={isPositive ? 'default' : 'destructive'} className="capitalize shrink-0">
                        {m.type === 'sale' ? 'Venta' : m.type === 'expense' ? 'Gasto' : m.type === 'income' ? 'Ingreso' : 'Ajuste'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-muted-foreground truncate max-w-[200px]">{m.description || 'Sin descripción'}</span>
                      <span className={`font-bold text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>
                        {isPositive ? '+' : '-'}{formatCurrency(Number(m.amount))}
                      </span>
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
                    <TableHead className="whitespace-nowrap">Fecha</TableHead>
                    <TableHead className="whitespace-nowrap">Caja</TableHead>
                    <TableHead className="whitespace-nowrap">Tipo</TableHead>
                    <TableHead className="whitespace-nowrap">Descripción</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString('es-NI', {
                          timeZone: 'America/Managua',
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{m.register?.name}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant={m.type === 'sale' || m.type === 'income' ? 'default' : 'destructive'}
                          className="capitalize"
                        >
                          {m.type === 'sale' ? 'Venta' : m.type === 'expense' ? 'Gasto' : m.type === 'income' ? 'Ingreso' : 'Ajuste'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{m.description || '—'}</TableCell>
                      <TableCell
                        className={`text-right font-bold whitespace-nowrap ${
                          m.type === 'sale' || m.type === 'income' ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {m.type === 'sale' || m.type === 'income' ? '+' : '-'}{formatCurrency(Number(m.amount))}
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
  )
}
