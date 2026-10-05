'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { monthName } from '@/lib/month-filter'

interface MonthComparisonProps {
  /** Total del mes seleccionado */
  currentTotal: number
  /** Total del mes anterior */
  prevTotal: number
  /** Año del mes seleccionado */
  year: number
  /** Mes del mes seleccionado (1-indexed) */
  month: number
  /** Etiqueta de la métrica, p.ej. "Ingresos", "Gastos" */
  label: string
  /** Si true, el incremento es "malo" (p.ej. gastos) */
  higherIsBad?: boolean
  /** Formato de número: 'currency' | 'integer' */
  format?: 'currency' | 'integer'
}

function prevMonthLabel(year: number, month: number): string {
  if (month === 1) return `${monthName(12)} ${year - 1}`
  return `${monthName(month - 1)} ${year}`
}

export function MonthComparison({
  currentTotal,
  prevTotal,
  year,
  month,
  label,
  higherIsBad = false,
  format = 'currency',
}: MonthComparisonProps) {
  const diff = currentTotal - prevTotal
  const pct = prevTotal > 0 ? (diff / prevTotal) * 100 : null

  const isUp = diff > 0
  const isDown = diff < 0
  const isEqual = diff === 0

  // ¿Es bueno el cambio?
  const isGood = higherIsBad ? isDown : isUp
  const isBad = higherIsBad ? isUp : isDown

  const trendColor = isGood
    ? 'text-success'
    : isBad
      ? 'text-destructive'
      : 'text-muted-foreground'

  const bgColor = isGood
    ? 'bg-success/8 border-success/20'
    : isBad
      ? 'bg-destructive/8 border-destructive/20'
      : 'bg-secondary/40 border-border'

  function fmt(n: number): string {
    if (format === 'integer') return n.toLocaleString('es')
    return formatCurrency(n)
  }

  return (
    <Card className={`border ${bgColor}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Etiqueta */}
          <div className="shrink-0">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
              Comparación — {label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              vs. {prevMonthLabel(year, month)}
            </p>
          </div>

          <div className="flex flex-wrap gap-6 sm:gap-8">
            {/* Mes actual */}
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                {monthName(month)} {year}
              </p>
              <p className="text-xl font-display font-black text-foreground">
                {fmt(currentTotal)}
              </p>
            </div>

            {/* Mes anterior */}
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                {prevMonthLabel(year, month)}
              </p>
              {prevTotal === 0 ? (
                <p className="text-sm text-muted-foreground italic mt-1">Sin datos</p>
              ) : (
                <p className="text-xl font-display font-black text-muted-foreground">
                  {fmt(prevTotal)}
                </p>
              )}
            </div>

            {/* Diferencia */}
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                Diferencia
              </p>
              {prevTotal === 0 ? (
                <p className="text-sm text-muted-foreground italic mt-1">—</p>
              ) : (
                <div className={`flex items-center gap-1.5 ${trendColor}`}>
                  {isUp && <TrendingUp className="h-4 w-4 shrink-0" />}
                  {isDown && <TrendingDown className="h-4 w-4 shrink-0" />}
                  {isEqual && <Minus className="h-4 w-4 shrink-0" />}
                  <div>
                    <p className="text-lg font-display font-black leading-none">
                      {isUp ? '+' : ''}{fmt(diff)}
                    </p>
                    {pct !== null && (
                      <p className="text-xs font-mono font-bold">
                        {isUp ? '+' : ''}{pct.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
