import { createClient } from '@/lib/supabase/server'
import { SalesReportClient } from './sales-report-client'
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

export default async function ReporteVentasPage({ searchParams }: Props) {
  const params = await searchParams
  const { year, month } = parseMonthParams(params)
  const isAnnual = params.view === 'annual'
  const supabase = await createClient()

  // ── VISTA ANUAL ──────────────────────────────────────────────────────────
  if (isAnnual) {
    const { startISO: yearStart, endISO: yearEnd } = getYearRange(year)
    const { data: yearRows } = await supabase
      .from('sales')
      .select('created_at, total, status')
      .gte('created_at', yearStart)
      .lte('created_at', yearEnd)

    const monthlyData = groupAmountsByMonth(
      yearRows || [],
      'created_at',
      'total',
      year,
      { filterFn: (r) => r.status === 'completed' }
    )

    const { year: curYear, month: curMonth } = parseMonthParams({})

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-black tracking-tight uppercase">Reporte de Ventas</h1>
            <p className="text-muted-foreground font-mono text-xs">
              Resumen anual de ingresos — {year}
            </p>
          </div>
        </div>
        <MonthFilter year={year} month={month} isAnnual />
        <AnnualBreakdown
          year={year}
          data={monthlyData}
          label="Ingresos de Ventas"
          currency
          currentMonth={year === curYear ? curMonth : undefined}
          showCount
          countLabel="Ventas"
        />
      </div>
    )
  }

  // ── VISTA MENSUAL (paralelo) ──────────────────────────────────────────────
  // Filtro de día: si existe y es válido, reemplaza el rango mensual
  const day = parseDayParam(params, year, month)
  const { startISO, endISO, startDate, endDate } = day !== null
    ? getDayRange(year, month, day)
    : getMonthRange(year, month)
  const { year: py, month: pm } = getPrevMonth(year, month)
  const { startISO: prevStart, endISO: prevEnd } = getMonthRange(py, pm)

  const [salesResult, prevSalesResult, cashiersResult] = await Promise.all([
    supabase
      .from('sales')
      .select(`
        id, sale_number, status, subtotal, discount_amount, delivery_amount, delivery_type, total, amount_paid, amount_pending,
        notes, created_at, completed_at, created_by,
        customer:customers(name),
        register:cash_registers(name),
        sale_items(id, quantity, unit_price, total, variant:product_variants(size, product:products(category:categories(name, description)))),
        payments(method, amount),
        cajero:profiles!sales_created_by_fkey(full_name)
      `)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: false }),
    supabase
      .from('sales')
      .select('created_at, total, status')
      .gte('created_at', prevStart)
      .lte('created_at', prevEnd),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ])

  const sales = salesResult.data || []
  const prevSales = prevSalesResult.data || []
  const cashiers = cashiersResult.data || []

  const prevTotal = prevSales
    .filter((s: any) => s.status === 'completed')
    .reduce((sum: number, s: any) => sum + Number(s.total), 0)

  return (
    <SalesReportClient
      initialSales={sales}
      cashiers={cashiers}
      startDate={startDate}
      endDate={endDate}
      year={year}
      month={month}
      day={day}
      prevMonthTotal={prevTotal}
      prevMonthSales={prevSales}
    />
  )
}
