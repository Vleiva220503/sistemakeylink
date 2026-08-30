import { createClient } from '@/lib/supabase/server'
import { CashReportClient } from './cash-report-client'

interface Props {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
  }>
}

export default async function ReporteMovimientosCajaPage({ searchParams }: Props) {
  const { startDate, endDate } = await searchParams
  const supabase = await createClient()

  // Calculate default dates (past 30 days)
  const todayStr = new Date().toISOString().split('T')[0]
  const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const finalStartDate = startDate || defaultStartDate
  const finalEndDate = endDate || todayStr

  // Load cash movements in range
  const { data: movementsRows, error: movementsErr } = await supabase
    .from('cash_movements')
    .select(`
      id, register_id, type, amount, description, created_by, created_at,
      cash_registers:cash_registers(name),
      usuario:profiles!cash_movements_created_by_fkey(full_name)
    `)
    // Nicaragua es UTC-6 fijo todo el año, sin horario de verano
    .gte('created_at', `${finalStartDate}T00:00:00-06:00`)
    .lte('created_at', `${finalEndDate}T23:59:59-06:00`)
    .order('created_at', { ascending: false })

  if (movementsErr) {
    console.error('Error fetching cash movements for report:', movementsErr)
  }

  const movements = movementsRows || []

  // Load registers
  const { data: registersData } = await supabase
    .from('cash_registers')
    .select('id, name')
    .order('name')
  const registers = registersData || []

  // Load profiles
  const { data: usersData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name')
  const cashiers = usersData || []

  return (
    <CashReportClient
      initialMovements={movements}
      registers={registers}
      cashiers={cashiers}
      startDate={finalStartDate}
      endDate={finalEndDate}
    />
  )
}
