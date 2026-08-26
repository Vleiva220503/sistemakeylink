import { createClient } from '@/lib/supabase/server'
import { SalesReportClient } from './sales-report-client'

interface Props {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
  }>
}

export default async function ReporteVentasPage({ searchParams }: Props) {
  const { startDate, endDate } = await searchParams
  const supabase = await createClient()

  // Calculate default dates (past 30 days)
  const todayStr = new Date().toISOString().split('T')[0]
  const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const finalStartDate = startDate || defaultStartDate
  const finalEndDate = endDate || todayStr

  // Load sales within date range with details
  const { data: salesRows, error: salesErr } = await supabase
    .from('sales')
    .select(`
      id, sale_number, status, subtotal, discount_amount, delivery_amount, total, amount_paid, amount_pending,
      notes, created_at, completed_at, created_by,
      customer:customers(name),
      register:cash_registers(name),
      sale_items(id, quantity, unit_price, total, variant:product_variants(size, product:products(category:categories(name, description)))),
      payments(method, amount),
      cajero:profiles!sales_created_by_fkey(full_name)
    `)
    .gte('created_at', `${finalStartDate}T00:00:00`)
    .lte('created_at', `${finalEndDate}T23:59:59`)
    .order('created_at', { ascending: false })

  if (salesErr) {
    console.error('Error fetching report sales:', salesErr)
  }

  const sales = salesRows || []

  // Load cashiers/admins for filter dropdown
  const { data: cashiersData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name')

  const cashiers = cashiersData || []

  return (
    <SalesReportClient
      initialSales={sales}
      cashiers={cashiers}
      startDate={finalStartDate}
      endDate={finalEndDate}
    />
  )
}
