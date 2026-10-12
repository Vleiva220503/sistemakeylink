import { createClient } from '@/lib/supabase/server'
import { CashReportClient } from './cash-report-client'
import {
  parseMonthParams, getMonthRange, getPrevMonth,
  getDayRange, parseDayParam,
  getYearRange, groupAmountsByMonth,
} from '@/lib/month-filter'
import { AnnualBreakdown } from '@/components/shared/annual-breakdown'
import { MonthFilter } from '@/components/shared/month-filter'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{
    year?: string
    month?: string
    day?: string
    view?: string
  }>
}

export default async function ReporteMovimientosCajaPage({ searchParams }: Props) {
  const params = await searchParams
  const { year, month } = parseMonthParams(params)
  const isAnnual = params.view === 'annual'
  const supabase = await createClient()

  // ── VISTA ANUAL ──────────────────────────────────────────────────────────
  if (isAnnual) {
    const { startISO: yearStart, endISO: yearEnd } = getYearRange(year)
    const { data: yearRows } = await supabase
      .from('cash_movements')
      .select('created_at, amount, type')
      .gte('created_at', yearStart)
      .lte('created_at', yearEnd)

    const monthlyData = groupAmountsByMonth(
      yearRows || [], 'created_at', 'amount', year
    )

    const { year: curYear, month: curMonth } = parseMonthParams({})
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight uppercase">Flujo de Caja</h1>
          <p className="text-muted-foreground font-mono text-xs">Resumen anual de movimientos — {year}</p>
        </div>
        <MonthFilter year={year} month={month} isAnnual />
        <AnnualBreakdown
          year={year}
          data={monthlyData}
          label="Flujo de Caja"
          currency
          currentMonth={year === curYear ? curMonth : undefined}
          showCount
          countLabel="Movimientos"
        />
      </div>
    )
  }

  // ── VISTA MENSUAL (consultas paralelas) ───────────────────────────────────
  // Filtro de día: si existe y es válido, reemplaza el rango mensual
  const day = parseDayParam(params, year, month)
  const { startISO, endISO, startDate, endDate } = day !== null
    ? getDayRange(year, month, day)
    : getMonthRange(year, month)
  const { year: py, month: pm } = getPrevMonth(year, month)
  const { startISO: prevStart, endISO: prevEnd } = getMonthRange(py, pm)

  const [movementsResult, prevMovResult, registersResult, usersResult] = await Promise.all([
    supabase
      .from('cash_movements')
      .select(`
        id, register_id, type, amount, description, created_by, created_at,
        cash_registers:cash_registers(name),
        usuario:profiles!cash_movements_created_by_fkey(full_name)
      `)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: false }),
    supabase.from('cash_movements').select('amount, type').gte('created_at', prevStart).lte('created_at', prevEnd),
    supabase.from('cash_registers').select('id, name').order('name'),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ])

  const movements = movementsResult.data || []
  const prevNetFlow = (prevMovResult.data || []).reduce((sum: number, m: any) => sum + Number(m.amount), 0)
  const registers = registersResult.data || []
  const cashiers = usersResult.data || []

  return (
    <CashReportClient
      initialMovements={movements}
      registers={registers}
      cashiers={cashiers}
      startDate={startDate}
      endDate={endDate}
      year={year}
      month={month}
      day={day}
      prevNetFlow={prevNetFlow}
    />
  )
}
