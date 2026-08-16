import { createClient } from '@/lib/supabase/server'
import { MovementsReportClient } from './movements-report-client'

interface Props {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
  }>
}

export default async function ReporteMovimientosInventarioPage({ searchParams }: Props) {
  const { startDate, endDate } = await searchParams
  const supabase = await createClient()

  // Calculate default dates (past 30 days)
  const todayStr = new Date().toISOString().split('T')[0]
  const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const finalStartDate = startDate || defaultStartDate
  const finalEndDate = endDate || todayStr

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
    .gte('created_at', `${finalStartDate}T00:00:00`)
    .lte('created_at', `${finalEndDate}T23:59:59`)
    .order('created_at', { ascending: false })

  if (movementsErr) {
    console.error('Error fetching inventory movements for report:', movementsErr)
  }

  const movements = movementsRows || []

  // Load users to filter by
  const { data: usersData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name')

  const users = usersData || []

  return (
    <MovementsReportClient
      initialMovements={movements}
      users={users}
      startDate={finalStartDate}
      endDate={finalEndDate}
    />
  )
}
