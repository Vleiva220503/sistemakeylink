'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { getWeeksInMonth, getPrevMonth, monthName, type WeekSlice } from '@/lib/month-filter'
import { CalendarRange } from 'lucide-react'

interface SaleRecord {
  created_at: string
  total: number | string
  status: string
}

interface WeeklyBreakdownProps {
  /** Año del mes seleccionado */
  year: number
  /** Mes seleccionado (1-indexed) */
  month: number
  /** Ventas del mes seleccionado (ya filtradas a completed) */
  sales: SaleRecord[]
  /** Ventas del mes anterior (ya filtradas a completed) */
  prevSales: SaleRecord[]
}

function sumSalesInRange(sales: SaleRecord[], startDate: string, endDate: string): number {
  return sales
    .filter((s) => {
      // Convertir created_at a fecha local Nicaragua (UTC-6)
      const d = new Date(s.created_at)
      const nicaMs = d.getTime() - 6 * 60 * 60 * 1000
      const nicaDate = new Date(nicaMs)
      const localDateStr = nicaDate.toISOString().split('T')[0]
      return localDateStr >= startDate && localDateStr <= endDate
    })
    .reduce((sum, s) => sum + Number(s.total), 0)
}

/**
 * Dado un slice de semana del mes actual, calcula el slice equivalente en el mes anterior.
 * "Equivalente" = mismos días de la semana (semana 1 → semana 1, etc.)
 */
function prevMonthEquivalentRange(
  prevYear: number,
  prevMonth: number,
  week: WeekSlice,
  prevWeeks: WeekSlice[]
): WeekSlice | null {
  return prevWeeks.find((w) => w.weekNum === week.weekNum) ?? null
}

export function WeeklyBreakdown({ year, month, sales, prevSales }: WeeklyBreakdownProps) {
  const weeks = getWeeksInMonth(year, month)
  const { year: py, month: pm } = getPrevMonth(year, month)
  const prevWeeks = getWeeksInMonth(py, pm)

  const completedSales = sales.filter((s) => s.status === 'completed')
  const completedPrev = prevSales.filter((s) => s.status === 'completed')

  const rows = weeks.map((week) => {
    const current = sumSalesInRange(completedSales, week.startDate, week.endDate)
    const prevSlice = prevMonthEquivalentRange(py, pm, week, prevWeeks)
    const prev = prevSlice ? sumSalesInRange(completedPrev, prevSlice.startDate, prevSlice.endDate) : null
    const diff = prev !== null ? current - prev : null
    const pct = prev !== null && prev > 0 ? ((current - prev) / prev) * 100 : null

    return { week, current, prev, diff, pct, prevSlice }
  })

  const totalCurrent = rows.reduce((s, r) => s + r.current, 0)
  const totalPrev = completedPrev.reduce((s, sale) => s + Number(sale.total), 0)
  const totalDiff = totalCurrent - totalPrev
  const totalPct = totalPrev > 0 ? (totalDiff / totalPrev) * 100 : null

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display font-black text-sm uppercase tracking-wide">
          <CalendarRange className="h-4 w-4" />
          Desglose Semanal — {monthName(month)} {year}
          <span className="text-muted-foreground font-normal text-xs font-mono normal-case ml-1">
            (lun → dom · comparado con {monthName(pm)} {py})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile card view */}
        <div className="block md:hidden space-y-3">
          {rows.map(({ week, current, prev, diff, pct }) => (
            <div key={week.weekNum} className="bg-background border border-border p-3.5 space-y-2 text-xs">
              <p className="font-bold text-foreground">{week.label}</p>
              <div className="grid grid-cols-3 gap-2 font-mono">
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase">Este mes</p>
                  <p className="font-bold text-foreground">{formatCurrency(current)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase">Mes ant.</p>
                  {prev === null ? (
                    <p className="text-muted-foreground italic">—</p>
                  ) : (
                    <p className="text-muted-foreground">{formatCurrency(prev)}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase">Diferencia</p>
                  {diff === null || prev === 0 ? (
                    <p className="text-muted-foreground italic">—</p>
                  ) : (
                    <p className={`font-bold ${diff >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                      {pct !== null && (
                        <span className="text-[10px] ml-1">({pct >= 0 ? '+' : ''}{pct.toFixed(0)}%)</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {/* Total row mobile */}
          <div className="bg-secondary/30 border border-border p-3.5 space-y-2 text-xs">
            <p className="font-black text-foreground uppercase font-display text-sm">Total del mes</p>
            <div className="grid grid-cols-3 gap-2 font-mono">
              <div>
                <p className="font-black text-foreground">{formatCurrency(totalCurrent)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{formatCurrency(totalPrev)}</p>
              </div>
              <div>
                {totalPrev === 0 ? (
                  <p className="text-muted-foreground italic">—</p>
                ) : (
                  <p className={`font-bold ${totalDiff >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {totalDiff >= 0 ? '+' : ''}{formatCurrency(totalDiff)}
                    {totalPct !== null && (
                      <span className="text-[10px] ml-1">({totalPct >= 0 ? '+' : ''}{totalPct.toFixed(0)}%)</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Semana</TableHead>
                <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Días</TableHead>
                <TableHead className="font-mono text-xs uppercase text-right whitespace-nowrap">
                  {monthName(month)} {year}
                </TableHead>
                <TableHead className="font-mono text-xs uppercase text-right whitespace-nowrap">
                  {monthName(pm)} {py}
                </TableHead>
                <TableHead className="font-mono text-xs uppercase text-right whitespace-nowrap">Diferencia</TableHead>
                <TableHead className="font-mono text-xs uppercase text-right whitespace-nowrap">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ week, current, prev, diff, pct }) => (
                <TableRow key={week.weekNum} className="text-xs">
                  <TableCell className="font-semibold whitespace-nowrap">
                    Semana {week.weekNum}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono whitespace-nowrap">
                    {week.startDay}–{week.endDay} {monthName(month).slice(0, 3)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-foreground whitespace-nowrap">
                    {formatCurrency(current)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground whitespace-nowrap">
                    {prev === null ? '—' : formatCurrency(prev)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono font-semibold whitespace-nowrap ${
                      diff === null ? 'text-muted-foreground' :
                      diff >= 0 ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {diff === null || prev === 0 ? '—' : `${diff >= 0 ? '+' : ''}${formatCurrency(diff)}`}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono font-semibold whitespace-nowrap ${
                      pct === null ? 'text-muted-foreground' :
                      pct >= 0 ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {pct === null || prev === 0 ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`}
                  </TableCell>
                </TableRow>
              ))}

              {/* Total row */}
              <TableRow className="border-t-2 bg-secondary/20 font-bold text-xs">
                <TableCell className="font-black font-display uppercase whitespace-nowrap" colSpan={2}>
                  Total {monthName(month)}
                </TableCell>
                <TableCell className="text-right font-mono font-black text-foreground whitespace-nowrap">
                  {formatCurrency(totalCurrent)}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground whitespace-nowrap">
                  {formatCurrency(totalPrev)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono font-black whitespace-nowrap ${
                    totalPrev === 0 ? 'text-muted-foreground' :
                    totalDiff >= 0 ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {totalPrev === 0 ? '—' : `${totalDiff >= 0 ? '+' : ''}${formatCurrency(totalDiff)}`}
                </TableCell>
                <TableCell
                  className={`text-right font-mono font-black whitespace-nowrap ${
                    totalPct === null ? 'text-muted-foreground' :
                    totalPct >= 0 ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {totalPct === null ? '—' : `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(1)}%`}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
