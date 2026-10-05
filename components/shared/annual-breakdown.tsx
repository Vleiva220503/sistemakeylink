import { monthName, type MonthlyData } from '@/lib/month-filter'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AnnualBreakdownProps {
  year: number
  data: MonthlyData[]
  label: string
  currency?: boolean
  /** Mes que se resalta (mes actual o seleccionado) */
  currentMonth?: number
  /** Mostrar columna de conteo */
  showCount?: boolean
  countLabel?: string
}

export function AnnualBreakdown({
  year,
  data,
  label,
  currency = true,
  currentMonth,
  showCount = false,
  countLabel = 'Registros',
}: AnnualBreakdownProps) {
  // Asegurar que los 12 meses estén presentes
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const found = data.find(d => d.month === m)
    return { month: m, total: found?.total ?? 0, count: found?.count ?? 0 }
  })

  const grandTotal = months.reduce((s, m) => s + m.total, 0)
  const grandCount = months.reduce((s, m) => s + m.count, 0)
  const peak = Math.max(...months.map(m => m.total))

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
          {label} — Año {year}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left py-2.5 px-4 text-xs text-muted-foreground font-mono uppercase tracking-wide w-36">
                  Mes
                </th>
                <th className="text-right py-2.5 px-4 text-xs text-muted-foreground font-mono uppercase tracking-wide">
                  {currency ? 'Monto' : 'Total'}
                </th>
                {showCount && (
                  <th className="text-right py-2.5 px-4 text-xs text-muted-foreground font-mono uppercase tracking-wide hidden sm:table-cell">
                    {countLabel}
                  </th>
                )}
                <th className="text-right py-2.5 px-4 text-xs text-muted-foreground font-mono uppercase tracking-wide">
                  vs Mes Ant.
                </th>
                <th className="text-right py-2.5 px-4 text-xs text-muted-foreground font-mono uppercase tracking-wide hidden md:table-cell">
                  % del Año
                </th>
                <th className="py-2.5 px-4 hidden lg:table-cell w-32" />
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => {
                const prev = i > 0 ? months[i - 1].total : null
                const diff = prev !== null ? m.total - prev : null
                const pct = prev && prev > 0 ? ((m.total - prev) / prev) * 100 : null
                const isPeak = m.total > 0 && m.total === peak
                const isCurrent = m.month === currentMonth
                const share = grandTotal > 0 ? (m.total / grandTotal) * 100 : 0
                const isFuture = m.total === 0 && (
                  (new Date().getMonth() + 1) < m.month &&
                  year === new Date().getFullYear()
                )

                return (
                  <tr
                    key={m.month}
                    className={`border-b border-border/40 transition-colors ${
                      isCurrent
                        ? 'bg-primary/5'
                        : isFuture
                        ? 'opacity-40'
                        : 'hover:bg-secondary/20'
                    }`}
                  >
                    {/* Mes */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">
                          {String(m.month).padStart(2, '0')}
                        </span>
                        <span className={`font-medium ${isCurrent ? 'text-primary font-bold' : ''}`}>
                          {monthName(m.month)}
                        </span>
                        {isPeak && (
                          <span className="text-[9px] bg-warning/20 text-warning px-1.5 py-0.5 font-mono font-bold tracking-wider shrink-0">
                            PICO
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 font-mono font-bold tracking-wider shrink-0">
                            HOY
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Monto */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                      {m.total > 0
                        ? (currency ? formatCurrency(m.total) : m.total.toLocaleString('es-NI'))
                        : <span className="text-muted-foreground font-normal text-xs">—</span>
                      }
                    </td>

                    {/* Conteo */}
                    {showCount && (
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground text-xs hidden sm:table-cell">
                        {m.count > 0 ? m.count : '—'}
                      </td>
                    )}

                    {/* vs Mes Anterior */}
                    <td className="py-3 px-4 text-right">
                      {diff !== null && pct !== null ? (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-mono font-bold ${
                            diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : 'text-muted-foreground'
                          }`}
                        >
                          {diff > 0 ? (
                            <TrendingUp className="h-3 w-3 shrink-0" />
                          ) : diff < 0 ? (
                            <TrendingDown className="h-3 w-3 shrink-0" />
                          ) : null}
                          {diff > 0 ? '+' : ''}{pct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* % del año */}
                    <td className="py-3 px-4 text-right hidden md:table-cell">
                      <span className="text-xs font-mono text-muted-foreground">
                        {share > 0 ? `${share.toFixed(1)}%` : '—'}
                      </span>
                    </td>

                    {/* Barra */}
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <div className="w-28 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-secondary/20">
                <td className="py-3.5 px-4 font-bold text-sm uppercase font-mono tracking-wide">
                  Total {year}
                </td>
                <td className="py-3.5 px-4 text-right font-bold font-mono tabular-nums text-primary">
                  {currency ? formatCurrency(grandTotal) : grandTotal.toLocaleString('es-NI')}
                </td>
                {showCount && (
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-muted-foreground text-sm hidden sm:table-cell">
                    {grandCount}
                  </td>
                )}
                <td colSpan={3} className="py-3.5 px-4 text-right text-xs text-muted-foreground font-mono">
                  12 meses
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
