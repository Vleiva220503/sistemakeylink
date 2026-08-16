import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Package, ShoppingCart, AlertTriangle, ArrowUpRight, ArrowDownRight, Zap, ArrowRight, CheckCircle2, Store } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { DashboardSummary } from '@/types/database'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import Image from 'next/image'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_dashboard_summary')
  if (error) console.error('Error fetching dashboard summary:', error)

  const summary: DashboardSummary = (data as unknown as DashboardSummary) || {
    today_sales: 0,
    today_transactions: 0,
    month_sales: 0,
    month_cost: 0,
    month_expenses: 0,
    total_products: 0,
    low_stock_variants: 0,
    out_of_stock: 0,
    pending_purchases: 0
  }

  const monthProfit = summary.month_sales - summary.month_cost - summary.month_expenses

  const now = new Date()
  const formattedDate = now.toLocaleDateString('es-HN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-8">
      {/* Brand Header Card */}
      <div className="relative overflow-hidden border border-border bg-card p-6 sm:p-8">
        {/* Subtle decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          {/* Logo */}
          <div className="shrink-0 h-28 w-28 sm:h-32 sm:w-32 relative rounded-2xl overflow-hidden border-2 border-primary/20 bg-white shadow-lg">
            <Image
              src="/logo-mundo-calzado.png"
              alt="Logo Mundo de Calzado"
              fill
              className="object-contain p-2"
              priority
            />
          </div>

          {/* Business Info */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2">
              <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight uppercase text-foreground">
                MUNDO DE CALZADO
              </h1>
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full px-3 py-1 text-xs font-display font-bold uppercase tracking-wider">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Sistema Activo
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-sans">
              Sistema de Gestión de Inventario &amp; Punto de Venta
            </p>
            <p className="text-xs text-muted-foreground/70 font-mono capitalize">
              {formattedDate}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
              <Link href="/ventas" className={buttonVariants({ variant: "default", size: "lg" })} style={{ color: 'hsl(var(--primary-foreground))' }}>
                <Store className="mr-2 h-4 w-4" /> Abrir POS
              </Link>
              <Link href="/productos" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Ver Catálogo
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Sneaker Metrics KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Today Sales */}
        <Card className="sneaker-card border-l-4 border-l-primary bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-display font-extrabold tracking-widest text-muted-foreground uppercase">VENTAS DE HOY</span>
            <div className="h-9 w-9 bg-primary text-primary-foreground flex items-center justify-center font-bold">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-black text-foreground">{formatCurrency(summary.today_sales)}</div>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              <span className="text-primary font-bold">{summary.today_transactions}</span> compras completadas
            </p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="sneaker-card border-l-4 border-l-foreground bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-display font-extrabold tracking-widest text-muted-foreground uppercase">FACTURACIÓN MES</span>
            <div className="h-9 w-9 bg-secondary text-foreground border border-border flex items-center justify-center font-bold">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-black text-foreground">{formatCurrency(summary.month_sales)}</div>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              Ingreso bruto acumulado
            </p>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className={`sneaker-card border-l-4 ${monthProfit >= 0 ? 'border-l-success' : 'border-l-destructive'} bg-card border-border`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-display font-extrabold tracking-widest text-muted-foreground uppercase">GANANCIA NETA</span>
            <div className={`h-9 w-9 flex items-center justify-center font-bold ${monthProfit >= 0 ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}`}>
              <Zap className="h-5 w-5 fill-current" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-display font-black ${monthProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(monthProfit)}
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-1 flex items-center gap-1">
              {monthProfit >= 0 ? (
                <span className="text-success flex items-center font-bold"><ArrowUpRight className="h-4 w-4" /> RENTABILIDAD POSITIVA</span>
              ) : (
                <span className="text-destructive flex items-center font-bold"><ArrowDownRight className="h-4 w-4" /> MARGEN EN PÉRDIDA</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card className="sneaker-card border-l-4 border-l-warning bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-display font-extrabold tracking-widest text-muted-foreground uppercase">SNEAKER ALERTS</span>
            <div className="h-9 w-9 bg-warning text-warning-foreground flex items-center justify-center font-bold">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-black text-warning">
              {summary.low_stock_variants + summary.out_of_stock} PARES
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              <span className="text-destructive font-bold">{summary.out_of_stock}</span> agotados · <span className="text-warning font-bold">{summary.low_stock_variants}</span> stock bajo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Bottom Section */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
        {/* Quick POS Access & Operational Stats (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="font-display text-2xl font-black uppercase tracking-tight flex items-center justify-between">
                <span>PUNTO DE VENTA EN TIENDA</span>
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/30 px-2 py-0.5">
                  POS ACTIVE
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground font-sans">
                Realiza cobros inmediatos en mostrador con escaneo de código de barras o selección manual de variantes por talla y color.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link href="/ventas" className={buttonVariants({ variant: "default", size: "lg" })} style={{ color: 'hsl(var(--primary-foreground))' }}>
                  Aperturar Terminal POS <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link href="/ventas/historial" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  Historial de Transacciones
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stock Breakdown (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="font-display text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                INVENTARIO DE PARES
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-background border border-border">
                <span className="font-display font-bold text-sm uppercase">CALZADO REGISTRADO</span>
                <span className="font-display font-black text-2xl text-primary">{summary.total_products} MODELOS</span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-warning/10 border border-warning/30">
                <span className="font-display font-bold text-sm uppercase text-warning">PARES EN STOCK BAJO</span>
                <span className="font-display font-black text-2xl text-warning">{summary.low_stock_variants} VARIANTES</span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-destructive/10 border border-destructive/30">
                <span className="font-display font-bold text-sm uppercase text-destructive">PARES AGOTADOS</span>
                <span className="font-display font-black text-2xl text-destructive">{summary.out_of_stock} VARIANTES</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
