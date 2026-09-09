'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { Search, X } from 'lucide-react'

interface Movement {
  id: string
  created_at: string
  type: string
  amount: number
  description: string | null
  register?: { name: string } | null
}

interface MovementsClientProps {
  movements: Movement[]
  startDate?: string
  endDate?: string
}

export function MovementsClient({ movements, startDate: initialStart = '', endDate: initialEnd = '' }: MovementsClientProps) {
  const router = useRouter()
  const [startDate, setStartDate] = useState(initialStart)
  const [endDate, setEndDate] = useState(initialEnd)

  function handleApply() {
    const params = new URLSearchParams()
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    const qs = params.toString()
    router.push('/caja' + (qs ? `?${qs}` : ''))
  }

  function handleClear() {
    setStartDate('')
    setEndDate('')
    router.push('/caja')
  }

  return (
    <div className="space-y-4">
      {/* Filtro de fechas */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Desde</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Hasta</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <Button size="sm" onClick={handleApply} className="gap-2 h-9">
          <Search className="h-3.5 w-3.5" />
          Aplicar
        </Button>
        {(initialStart || initialEnd) && (
          <Button size="sm" variant="ghost" onClick={handleClear} className="gap-2 h-9">
            <X className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {movements.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Sin movimientos registrados</p>
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
                      <Badge variant={m.type === 'sale' || m.type === 'income' ? 'default' : 'destructive'} className="capitalize">
                        {m.type === 'sale' ? 'Venta' : m.type === 'expense' ? 'Gasto' : m.type === 'income' ? 'Ingreso' : 'Ajuste'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{m.description || '—'}</TableCell>
                    <TableCell className={`text-right font-bold whitespace-nowrap ${m.type === 'sale' || m.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                      {m.type === 'sale' || m.type === 'income' ? '+' : '-'}{formatCurrency(Number(m.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
