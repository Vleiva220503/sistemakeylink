import { createClient } from '@/lib/supabase/server'
import { MovementsReportClient } from './movements-report-client'
import { parseMonthParams, getMonthRange, getDayRange, parseDayParam } from '@/lib/month-filter'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{
    year?: string
    month?: string
    day?: string
  }>
}

export default async function ReporteMovimientosInventarioPage({ searchParams }: Props) {
  const params = await searchParams
  const { year, month } = parseMonthParams(params)
  // Filtro de día: created_at es ISO timestamp, usa rango UTC ajustado a Nicaragua
  const day = parseDayParam(params, year, month)
  const { startISO, endISO, startDate, endDate } = day !== null
    ? getDayRange(year, month, day)
    : getMonthRange(year, month)
  const supabase = await createClient()

  // Load inventory movements in range
  const { data: movementsRows, error: movementsErr } = await supabase
    .from('inventory_movements')
    .select(`
      id, variant_id, type, quantity, stock_before, stock_after, notes, created_by, created_at,
      product_variants:product_variants(
        id, sku,
        product:products(name)
      ),
      usuario:profiles!inventory_movements_created_by_fkey(full_name)
    `)
    // Nicaragua es UTC-6 fijo todo el año, sin horario de verano
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at', { ascending: false })

  if (movementsErr) console.error('Error fetching inventory movements for report:', movementsErr)
  const movements = movementsRows || []

  // Users for filter dropdown
  const { data: usersData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name')
  const users = usersData || []

  return (
    <MovementsReportClient
      initialMovements={movements}
      users={users}
      startDate={startDate}
      endDate={endDate}
      year={year}
      month={month}
      day={day}
    />
  )
}
