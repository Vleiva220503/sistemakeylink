/**
 * Utilidades de filtrado por mes — Zona horaria Nicaragua (UTC-6, sin DST)
 * Usado por las páginas de servidor y los componentes compartidos de filtro.
 */


export interface MonthRange {
  /** ISO string con offset para consultas Supabase gte/lte */
  startISO: string
  endISO: string
  /** YYYY-MM-DD para uso en inputs y etiquetas */
  startDate: string
  endDate: string
}

/**
 * Devuelve el año y mes actual según la hora de Nicaragua (UTC-6).
 */
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date()
  // Desplazar a UTC-6 manualmente para obtener fecha local de Nicaragua
  const nicaMs = now.getTime() - 6 * 60 * 60 * 1000
  const nicaDate = new Date(nicaMs)
  return {
    year: nicaDate.getUTCFullYear(),
    month: nicaDate.getUTCMonth() + 1, // 1-indexed
  }
}

/**
 * Calcula el rango de fechas (inicio y fin) para un mes dado.
 * Nicaragua = UTC-6 sin horario de verano.
 * Se usa UTC puro (sufijo Z) para máxima compatibilidad con Supabase/PostgREST:
 *   - medianoche Nicaragua = 06:00 UTC del mismo día
 *   - 23:59:59.999 Nicaragua = 05:59:59.999 UTC del día siguiente
 */
export function getMonthRange(year: number, month: number): MonthRange {
  const mm = String(month).padStart(2, '0')
  // Último día del mes
  const lastDay = new Date(year, month, 0).getDate()
  const dd = String(lastDay).padStart(2, '0')

  // Nicaragua UTC-6: medianoche local = 06:00 UTC
  // startISO: primer día del mes a las 00:00 Nicaragua = mismo día 06:00 UTC
  const startISO = `${year}-${mm}-01T06:00:00.000Z`

  // endISO: último milisegundo de la noche Nicaragua = primer día del MES SIGUIENTE a 05:59:59 UTC
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextMM = String(nextMonth).padStart(2, '0')
  const endISO = `${nextYear}-${nextMM}-01T05:59:59.999Z`

  return {
    startISO,
    endISO,
    startDate: `${year}-${mm}-01`,
    endDate: `${year}-${mm}-${dd}`,
  }
}

/**
 * Calcula el rango de fechas (inicio y fin) para un día específico de un mes.
 * Nicaragua = UTC-6 sin horario de verano.
 * Start: 00:00 Nicaragua = 06:00 UTC del mismo día.
 * End:   23:59:59.999 Nicaragua = 05:59:59.999 UTC del día siguiente.
 *
 * Para campos de tipo YYYY-MM-DD (no timestamp), el rango es exactamente ese día
 * y devuelve startDate === endDate.
 */
export function getDayRange(
  year: number,
  month: number,
  day: number
): { startISO: string; endISO: string; startDate: string; endDate: string } {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')

  // Día siguiente para calcular el final del día en UTC
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1))
  const nextYear  = nextDay.getUTCFullYear()
  const nextMonth = String(nextDay.getUTCMonth() + 1).padStart(2, '0')
  const nextDd    = String(nextDay.getUTCDate()).padStart(2, '0')

  return {
    // Nicaragua 00:00 → UTC 06:00 del mismo día
    startISO:  `${year}-${mm}-${dd}T06:00:00.000Z`,
    // Nicaragua 23:59:59.999 → UTC 05:59:59.999 del día siguiente
    endISO:    `${nextYear}-${nextMonth}-${nextDd}T05:59:59.999Z`,
    // Para campos YYYY-MM-DD el rango es el mismo día
    startDate: `${year}-${mm}-${dd}`,
    endDate:   `${year}-${mm}-${dd}`,
  }
}

/**
 * Parsea el parámetro de URL `day` validando que sea un día real del mes.
 * Devuelve null si no existe o no es válido (fuera de rango, no bisiesto, etc.).
 */
export function parseDayParam(
  params: { day?: string },
  year: number,
  month: number
): number | null {
  if (!params.day) return null
  const d = parseInt(params.day, 10)
  if (isNaN(d) || d < 1) return null
  // Último día real del mes (maneja años bisiestos automáticamente)
  const lastDay = new Date(year, month, 0).getDate()
  if (d > lastDay) return null
  return d
}

/**
 * Parsea los parámetros de URL `year` y `month` con fallback al mes actual.
 */
export function parseMonthParams(params: {
  year?: string
  month?: string
}): { year: number; month: number } {
  const current = getCurrentYearMonth()
  const year = params.year ? parseInt(params.year, 10) : current.year
  const month = params.month ? parseInt(params.month, 10) : current.month
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 2000 || year > 2100) {
    return current
  }
  return { year, month }
}

/**
 * Devuelve el rango completo de un año (para vista anual).
 * Nicaragua UTC-6: Jan 1 00:00 NI = Jan 1 06:00 UTC.
 */
export function getYearRange(year: number): { startISO: string; endISO: string } {
  return {
    startISO: `${year}-01-01T06:00:00.000Z`,
    endISO: `${year + 1}-01-01T05:59:59.999Z`,
  }
}

export interface MonthlyData {
  month: number // 1–12
  total: number
  count: number
}

/**
 * Agrupa filas por mes con zona horaria Nicaragua (UTC-6).
 * @param rows      Array de objetos con fecha y monto.
 * @param dateKey   Nombre del campo de fecha (ISO timestamp o YYYY-MM-DD).
 * @param amountKey Nombre del campo de monto numérico.
 * @param year      Año objetivo.
 * @param opts.isDateOnly  true si el campo es solo fecha YYYY-MM-DD (no timestamp).
 * @param opts.filterFn    Función de filtro adicional (ej. solo ventas completadas).
 */
export function groupAmountsByMonth(
  rows: Array<Record<string, any>>,
  dateKey: string,
  amountKey: string,
  year: number,
  opts?: {
    isDateOnly?: boolean
    filterFn?: (row: any) => boolean
  }
): MonthlyData[] {
  const map: Record<number, { total: number; count: number }> = {}
  for (let m = 1; m <= 12; m++) map[m] = { total: 0, count: 0 }

  for (const row of rows) {
    if (opts?.filterFn && !opts.filterFn(row)) continue

    const dateVal = row[dateKey] as string
    let month: number
    let rowYear: number

    if (opts?.isDateOnly) {
      // YYYY-MM-DD: extraer directamente
      rowYear = parseInt(dateVal.substring(0, 4), 10)
      month = parseInt(dateVal.substring(5, 7), 10)
    } else {
      // ISO timestamp: convertir a Nicaragua UTC-6
      const nicaMs = new Date(dateVal).getTime() - 6 * 60 * 60 * 1000
      const d = new Date(nicaMs)
      rowYear = d.getUTCFullYear()
      month = d.getUTCMonth() + 1
    }

    if (rowYear !== year) continue
    map[month].total += Number(row[amountKey] || 0)
    map[month].count++
  }

  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    total: map[i + 1].total,
    count: map[i + 1].count,
  }))
}

/**
 * Devuelve el mes anterior (maneja el cruce de año).
 */
export function getPrevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 }
  return { year, month: month - 1 }
}

/**
 * Formatea un número de mes (1-12) a su nombre en español.
 */
export function monthName(month: number): string {
  const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return MONTHS[month - 1] ?? ''
}

/**
 * Devuelve un array con las semanas del mes.
 * Criterio: semana = lunes a domingo (ISO 8601).
 * La semana 1 empieza el día 1 del mes (aunque sea miércoles).
 */
export interface WeekSlice {
  weekNum: number
  /** Primer día de la semana dentro del mes (1-indexed) */
  startDay: number
  /** Último día de la semana dentro del mes */
  endDay: number
  /** Label para mostrar */
  label: string
  /** ISO date strings para comparar con datos */
  startDate: string
  endDate: string
}

export function getWeeksInMonth(year: number, month: number): WeekSlice[] {
  const mm = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  const weeks: WeekSlice[] = []

  let weekNum = 1
  let currentDay = 1

  while (currentDay <= lastDay) {
    const dayOfWeek = new Date(year, month - 1, currentDay).getDay() // 0=dom, 1=lun...
    // Buscar el domingo siguiente (fin de la semana ISO o fin de mes)
    let endDay = currentDay
    // Avanzar hasta el domingo (dayOfWeek === 0) o fin de mes
    let d = currentDay
    while (d <= lastDay) {
      endDay = d
      const dow = new Date(year, month - 1, d).getDay()
      if (dow === 0) break // domingo → fin de semana
      d++
    }

    const startDd = String(currentDay).padStart(2, '0')
    const endDd = String(endDay).padStart(2, '0')

    weeks.push({
      weekNum,
      startDay: currentDay,
      endDay,
      label: `Semana ${weekNum} (${currentDay}–${endDay} ${monthName(month)})`,
      startDate: `${year}-${mm}-${startDd}`,
      endDate: `${year}-${mm}-${endDd}`,
    })

    weekNum++
    currentDay = endDay + 1
  }

  return weeks
}
