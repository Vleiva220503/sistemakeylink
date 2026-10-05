'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, CalendarDays, BarChart2, CalendarRange } from 'lucide-react'
import { monthName } from '@/lib/month-filter'

interface MonthFilterProps {
  year: number
  month: number
  /** true cuando la página está en modo vista anual */
  isAnnual?: boolean
}

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
// Rango fijo de años del sistema: 2026–2040
const YEARS = Array.from({ length: 15 }, (_, i) => 2026 + i)

export function MonthFilter({ year, month, isAnnual = false }: MonthFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function navigate(newYear: number, newMonth: number, keepAnnual = false) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('year', String(newYear))
    params.set('month', String(newMonth))
    // Remove legacy date params
    params.delete('startDate')
    params.delete('endDate')
    params.delete('page')
    if (!keepAnnual) params.delete('view')
    router.push(`${pathname}?${params.toString()}`)
  }

  function prevMonth() {
    if (month === 1) navigate(year - 1, 12)
    else navigate(year, month - 1)
  }

  function nextMonth() {
    if (month === 12) navigate(year + 1, 1)
    else navigate(year, month + 1)
  }

  function toggleAnnual() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('year', String(year))
    params.set('month', String(month))
    params.delete('startDate')
    params.delete('endDate')
    params.delete('page')
    if (isAnnual) {
      params.delete('view')
    } else {
      params.set('view', 'annual')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const { year: currentYear, month: currentMonth } = (() => {
    const now = new Date()
    const nicaMs = now.getTime() - 6 * 60 * 60 * 1000
    const d = new Date(nicaMs)
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }
  })()

  const isCurrentMonth = month === currentMonth && year === currentYear

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Vista: Mes / Año toggle */}
      <button
        onClick={toggleAnnual}
        title={isAnnual ? 'Ver por mes' : 'Ver año completo'}
        className={`h-9 px-3 flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
          isAnnual
            ? 'bg-primary text-primary-foreground border-primary'
            : 'border-border bg-card hover:bg-secondary text-foreground'
        }`}
        aria-pressed={isAnnual}
      >
        {isAnnual ? (
          <>
            <CalendarDays className="h-3.5 w-3.5" />
            Ver Mes
          </>
        ) : (
          <>
            <BarChart2 className="h-3.5 w-3.5" />
            Ver Año
          </>
        )}
      </button>

      {/* Divider */}
      <span className="h-5 w-px bg-border shrink-0" />

      {/* Prev month (hidden in annual view) */}
      {!isAnnual && (
        <button
          onClick={prevMonth}
          title="Mes anterior"
          className="h-9 w-9 flex items-center justify-center border border-border bg-card hover:bg-secondary transition-colors cursor-pointer"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Month selector (hidden in annual view) */}
      {!isAnnual && (
        <div className="flex items-center gap-1.5 border border-border bg-card px-3 h-9">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <select
            value={month}
            onChange={(e) => navigate(year, parseInt(e.target.value, 10))}
            className="bg-transparent text-sm font-bold font-display text-foreground outline-none cursor-pointer"
            aria-label="Seleccionar mes"
          >
            {ALL_MONTHS.map((m) => (
              <option key={m} value={m}>
                {monthName(m)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Year selector */}
      <div className="flex items-center gap-1.5 border border-border bg-card px-3 h-9">
        {isAnnual && <CalendarRange className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        <select
          value={year}
          onChange={(e) => {
            const newYear = parseInt(e.target.value, 10)
            if (isAnnual) {
              // En vista anual, solo cambiar el año manteniendo view=annual
              const params = new URLSearchParams(searchParams.toString())
              params.set('year', String(newYear))
              params.set('view', 'annual')
              params.delete('page')
              router.push(`${pathname}?${params.toString()}`)
            } else {
              navigate(newYear, month)
            }
          }}
          className="bg-transparent text-sm font-bold font-display text-foreground outline-none cursor-pointer"
          aria-label="Seleccionar año"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Next month (hidden in annual view) */}
      {!isAnnual && (
        <button
          onClick={nextMonth}
          title="Mes siguiente"
          className="h-9 w-9 flex items-center justify-center border border-border bg-card hover:bg-secondary transition-colors cursor-pointer"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* "Mes actual" shortcut (only in month view) */}
      {!isAnnual && !isCurrentMonth && (
        <button
          onClick={() => navigate(currentYear, currentMonth)}
          className="h-9 px-3 text-xs font-mono font-bold uppercase tracking-wider text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
        >
          Hoy
        </button>
      )}
    </div>
  )
}
