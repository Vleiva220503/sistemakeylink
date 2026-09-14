import { createClient } from '@/lib/supabase/server'
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Award,
  ClipboardList,
  Wallet,
  Percent,
  ArrowRight,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ period?: string }>
}

export default async function ReportesPage({ searchParams }: Props) {
  const { period = 'month' } = await searchParams
  const supabase = await createClient()

  const now = new Date()
  let startDate = new Date()

  if (period === 'day') {
    startDate.setHours(0, 0, 0, 0)
  } else if (period === 'week') {
    startDate.setDate(now.getDate() - 7)
  } else if (period === 'month') {
    startDate.setMonth(now.getMonth() - 1)
  } else if (period === 'year') {
    startDate.setFullYear(now.getFullYear() - 1)
  } else {
    startDate = new Date(0)
  }

  let query = supabase
    .from('sales')
    .select('total, status, created_at')
    .eq('status', 'completed')

  if (period !== 'all') {
    query = query.gte('created_at', startDate.toISOString())
  }

  const { data: salesRows } = await query
  const sales = salesRows || []

  const periodRevenue = sales.reduce((sum: number, s: any) => sum + Number(s.total), 0)
  const periodTransactions = sales.length

  const reportsList = [
    {
      name: 'Reporte de Ventas',
      description: 'Análisis detallado de transacciones, métodos de pago y ventas diarias.',
      href: '/reportes/ventas',
      icon: ShoppingCart,
      color: 'text-primary bg-primary/10',
    },
    {
      name: 'Productos Más Vendidos',
      description: 'Ranking de calzado por volumen de unidades y montos netos generados.',
      href: '/reportes/productos',
      icon: Award,
      color: 'text-warning bg-warning/10',
    },
    {
      name: 'Valorización del Inventario',
      description: 'Cálculo del valor total de stock en costo y precio de venta potencial.',
      href: '/reportes/inventario',
      icon: Package,
      color: 'text-success bg-success/10',
    },
    {
      name: 'Auditoría de Movimientos',
      description: 'Historial de ajustes manuales, mermas, compras y entradas de stock.',
      href: '/reportes/movimientos',
      icon: ClipboardList,
      color: 'text-blue-600 bg-blue-600/10',
    },
    {
      name: 'Flujo de Caja',
      description: 'Control de arqueos de caja, ingresos, egresos y movimientos de efectivo.',
      href: '/reportes/caja',
      icon: Wallet,
      color: 'text-indigo-600 bg-indigo-600/10',
    },
    {
      name: 'Rentabilidad Neta',
      description: 'Cálculo mensual de utilidad neta cruzando COGS y gastos operativos.',
      href: '/reportes/rentabilidad',
      icon: Percent,
      color: 'text-amber-600 bg-amber-600/10',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight uppercase">Módulos de Reporte</h1>
          <p className="text-muted-foreground font-mono text-xs">
            Selecciona un reporte detallado o visualiza las métricas rápidas del período.
          </p>
        </div>

        {/* Period Selector Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground uppercase font-mono tracking-wider">Período:</span>
          <div className="flex bg-muted p-1 border border-border">
            <Link
              href="/reportes?period=day"
              className={`px-3 py-1 text-xs font-bold font-display uppercase tracking-wider transition-colors ${
                period === 'day' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Hoy
            </Link>
            <Link
              href="/reportes?period=week"
              className={`px-3 py-1 text-xs font-bold font-display uppercase tracking-wider transition-colors ${
                period === 'week' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Semana
            </Link>
            <Link
              href="/reportes?period=month"
              className={`px-3 py-1 text-xs font-bold font-display uppercase tracking-wider transition-colors ${
                period === 'month' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mes
            </Link>
            <Link
              href="/reportes?period=year"
              className={`px-3 py-1 text-xs font-bold font-display uppercase tracking-wider transition-colors ${
                period === 'year' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Año
            </Link>
            <Link
              href="/reportes?period=all"
              className={`px-3 py-1 text-xs font-bold font-display uppercase tracking-wider transition-colors ${
                period === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todo
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-display font-black text-foreground">{formatCurrency(periodRevenue)}</p>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Ingresos ({period})</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-display font-black text-success">{periodTransactions}</p>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Transacciones</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xl font-display font-black text-warning">
                  {periodTransactions > 0 ? formatCurrency(periodRevenue / periodTransactions) : '$0'}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Ticket Promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-display font-black text-foreground">{sales.length}</p>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Registros</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Grid Catalogo */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold font-mono text-muted-foreground uppercase tracking-widest">Catálogo de Reportes Detallados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportsList.map((rep) => {
            const IconComp = rep.icon
            return (
              <Link key={rep.name} href={rep.href} className="group">
                <Card className="h-full border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all rounded-none cursor-pointer flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${rep.color}`}>
                        <IconComp className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <CardTitle className="text-base font-display font-black uppercase text-foreground mt-4">
                      {rep.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {rep.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
