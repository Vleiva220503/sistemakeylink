'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, CalendarDays, BarChart2, CalendarRange, CalendarCheck, X } from 'lucide-react'
import { monthName } from '@/lib/month-filter'

interface MonthFilterProps {
  year: number
  month: number
  /** Día actualmente seleccionado (null = sin filtro de día) */
  day?: number | null
  /** true cuando la página está en modo vista anual */
  isAnnual?: boolean
}

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
// Rango fijo de años del sistema: 2026–2040
const YEARS = Array.from({ length: 15 }, (_, i) => 2026 + i)

/**
 * Devuelve el último día real del mes indicado (maneja años bisiestos).
 */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Genera array de días válidos para el mes/año seleccionado.
 */
function daysInMonth(year: number, month: number): number[] {
  const last = lastDayOfMonth(year, month)
  return Array.from({ length: last }, (_, i) => i + 1)
}

export function MonthFilter({ year, month, day = null, isAnnual = false }: MonthFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  /** Navega conservando todos los params existentes y actualizando los indicados. */
  function navigate(newYear: number, newMonth: number, newDay: number | null = null, keepAnnual = false) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('year', String(newYear))
    params.set('month', String(newMonth))
    // Limpiar params heredados
    params.delete('startDate')
    params.delete('endDate')
    params.delete('page')
    if (!keepAnnual) params.delete('view')

    // Ajustar el día: si el día pedido no existe en el nuevo mes, lo limpiamos
    if (newDay !== null) {
      const maxDay = lastDayOfMonth(newYear, newMonth)
      if (newDay >= 1 && newDay <= maxDay) {
        params.set('day', String(newDay))
      } else {
        // El día elegido no existe en el nuevo mes → resetear
        params.delete('day')
      }
    } else {
      params.delete('day')
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  /** Solo actualiza el día conservando el mes/año actuales. */
  function navigateDay(newDay: number | null) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page')
    if (newDay !== null) {
      params.set('day', String(newDay))
    } else {
      params.delete('day')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  function prevMonth() {
    if (month === 1) navigate(year - 1, 12, null)
    else navigate(year, month - 1, null)
  }

  function nextMonth() {
    if (month === 12) navigate(year + 1, 1, null)
    else navigate(year, month + 1, null)
  }

  function toggleAnnual() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('year', String(year))
    params.set('month', String(month))
    params.delete('startDate')
    params.delete('endDate')
    params.delete('page')
    params.delete('day')
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
  // Días válidos para el mes/año actualmente seleccionado
  const days = daysInMonth(year, month)
  // Etiqueta del filtro activo para mostrar al usuario
  const activeLabel = day !== null
    ? `${day} de ${monthName(month)} ${year}`
    : `${monthName(month)} ${year}`

  return (
    <div className="flex flex-col gap-2">
      {/* Fila principal: controles de navegación */}
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
              onChange={(e) => navigate(year, parseInt(e.target.value, 10), null)}
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
                const params = new URLSearchParams(searchParams.toString())
                params.set('year', String(newYear))
                params.set('view', 'annual')
                params.delete('page')
                router.push(`${pathname}?${params.toString()}`)
              } else {
                navigate(newYear, month, null)
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
            onClick={() => navigate(currentYear, currentMonth, null)}
            className="h-9 px-3 text-xs font-mono font-bold uppercase tracking-wider text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
          >
            Hoy
          </button>
        )}

        {/* ── Selector de día (solo en vista mensual) ──────────────────── */}
        {!isAnnual && (
          <>
            {/* Divider */}
            <span className="h-5 w-px bg-border shrink-0" />

            {/* Selector de día */}
            <div
              className={`flex items-center gap-1.5 border px-3 h-9 transition-colors ${
                day !== null
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <select
                value={day ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  navigateDay(val === '' ? null : parseInt(val, 10))
                }}
                className="bg-transparent text-sm font-bold font-display text-foreground outline-none cursor-pointer"
                aria-label="Filtrar por día"
              >
                {/* Opción vacía = sin filtro de día */}
                <option value="">Todo el mes</option>
                {days.map((d) => (
                  <option key={d} value={d}>
                    Día {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón limpiar día (solo cuando hay un día activo) */}
            {day !== null && (
              <button
                onClick={() => navigateDay(null)}
                title="Quitar filtro de día"
                className="h-9 px-2.5 flex items-center gap-1 text-xs font-mono font-bold uppercase tracking-wider text-primary border border-primary/40 bg-primary/5 hover:bg-primary/15 transition-colors cursor-pointer"
                aria-label="Limpiar filtro de día"
              >
                <X className="h-3.5 w-3.5" />
                <span>Día {day}</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Etiqueta del filtro activo (solo en vista mensual) */}
      {!isAnnual && (
        <p className="text-xs text-muted-foreground font-mono">
          {day !== null ? (
            <>
              <span className="text-primary font-bold">Filtrando:</span>{' '}
              {activeLabel}
            </>
          ) : (
            <>Mostrando: {activeLabel}</>
          )}
        </p>
      )}
    </div>
  )
}
