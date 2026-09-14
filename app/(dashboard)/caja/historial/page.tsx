import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Archive, DollarSign, AlertTriangle, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SessionsClient, type SessionRow } from './sessions-client'

interface PageProps {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
    registerId?: string
  }>
}

export default async function HistorialCajaPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { startDate, endDate, registerId } = await searchParams

  // ── Build server-side filtered query ───────────────────────────────────────
  let query = (supabase as any)
    .from('cash_register_sessions')
    .select(`
      *,
      register:cash_registers(id, name),
      opener:profiles!opened_by(id, full_name),
      closer:profiles!closed_by(id, full_name)
    `)
    .order('closed_at', { ascending: false, nullsFirst: false })

  // Date filter — Nicaragua is UTC-6 fixed (no DST)
  if (startDate) {
    query = query.gte('closed_at', `${startDate}T00:00:00-06:00`)
  }
  if (endDate) {
    query = query.lte('closed_at', `${endDate}T23:59:59-06:00`)
  }

  // Register filter
  if (registerId && registerId !== 'all') {
    query = query.eq('register_id', registerId)
  }

  const { data: sessions, error } = await query.limit(500)

  // ── Fetch register list for the filter dropdown ─────────────────────────────
  const { data: registersData } = await (supabase as any)
    .from('cash_registers')
    .select('id, name')
    .order('name')

  const history: SessionRow[] = (sessions as any[]) || []
  const registers: { id: string; name: string }[] = (registersData as any[]) || []

  // ── KPI calculations ────────────────────────────────────────────────────────
  const totalCierres = history.length
  const totalVentas = history.reduce((s, r) => s + Number(r.total_sales_amount || 0), 0)
  const conDescuadre = history.filter((r) => r.difference !== null && Number(r.difference) !== 0).length
  const descuadreTotal = history.reduce((s, r) => s + Number(r.difference || 0), 0)

  const kpis = [
    {
      label: 'Total Cierres',
      value: totalCierres.toString(),
      icon: Archive,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      label: 'Total Ventas',
      value: formatCurrency(totalVentas),
      icon: DollarSign,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      label: 'Con Descuadre',
      value: conDescuadre.toString(),
      icon: AlertTriangle,
      iconBg: conDescuadre > 0 ? 'bg-destructive/10' : 'bg-muted/30',
      iconColor: conDescuadre > 0 ? 'text-destructive' : 'text-muted-foreground',
    },
    {
      label: 'Descuadre Acumulado',
      value: (descuadreTotal >= 0 ? '+' : '') + formatCurrency(descuadreTotal),
      icon: TrendingDown,
      iconBg: descuadreTotal < 0 ? 'bg-destructive/10' : descuadreTotal > 0 ? 'bg-success/10' : 'bg-muted/30',
      iconColor: descuadreTotal < 0 ? 'text-destructive' : descuadreTotal > 0 ? 'text-success' : 'text-muted-foreground',
    },
  ]

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link href="/caja">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Historial de Cierres</h1>
          <p className="text-muted-foreground">Consulta de turnos y cierres de caja anteriores</p>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg ${kpi.iconBg} flex items-center justify-center shrink-0`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold truncate">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Error state ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20">
          <p className="font-medium">Error al cargar el historial</p>
          <p className="text-sm opacity-80 mt-1">
            Asegúrate de haber ejecutado la migración SQL de cash_register_sessions.
          </p>
          <p className="text-xs opacity-60 mt-1 font-mono">{(error as any).message}</p>
        </div>
      )}

      {/* ── Main table (client component) ────────────────────────────────────── */}
      {!error && (
        <SessionsClient
          sessions={history}
          registers={registers}
          startDate={startDate || ''}
          endDate={endDate || ''}
          registerId={registerId || 'all'}
        />
      )}
    </div>
  )
}
