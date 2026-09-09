import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { DollarSign, CreditCard, Lock, Unlock, TrendingUp, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { CashRegisterActions } from './cash-register-actions'
import { getCurrentShiftSummary } from '@/app/actions/cash-register'
import { MovementsClient } from './movements-client'

export default async function CajaPage({ searchParams }: { searchParams: Promise<{ startDate?: string; endDate?: string }> }) {
  const supabase = await createClient()
  const { startDate, endDate } = await searchParams

  // Build movements query — date filter applies ONLY here
  let movQuery = (supabase as any)
    .from('cash_movements')
    .select('*, register:cash_registers(name)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (startDate) movQuery = movQuery.gte('created_at', `${startDate}T00:00:00-06:00`)
  if (endDate)   movQuery = movQuery.lte('created_at', `${endDate}T23:59:59-06:00`)

  const [{ data: regRows }, { data: movRows }] = await Promise.all([
    (supabase as any).from('cash_registers').select('*').order('name'),
    movQuery,
  ])

  const registers = (regRows as any[]) || []
  const movements = (movRows as any[]) || []

  // Fetch summaries for all open registers
  const openRegisters = registers.filter(r => r.status === 'open')
  const shiftSummaries = await Promise.all(openRegisters.map(async (reg) => {
    const res = await getCurrentShiftSummary(reg.id)
    return { register: reg, summary: res.data }
  }))

  const totalCash = movements
    .filter((m: any) => m.type === 'sale')
    .reduce((sum: number, m: any) => sum + Number(m.amount), 0)

  const totalExpenses = movements
    .filter((m: any) => m.type === 'expense')
    .reduce((sum: number, m: any) => sum + Number(m.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Caja</h1>
          <p className="text-muted-foreground">Control de cajas registradoras y movimientos</p>
        </div>
        <Link href="/caja/historial">
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Historial de Cierres
          </Button>
        </Link>
      </div>

      {/* Registers */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {registers.map((reg: any) => (
          <Card key={reg.id} className={`border-2 ${reg.status === 'open' ? 'border-success/40' : 'border-border'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {reg.name}
                </CardTitle>
                <Badge variant={reg.status === 'open' ? 'default' : 'secondary'}>
                  {reg.status === 'open' ? (
                    <><Unlock className="mr-1 h-3 w-3" />Abierta</>
                  ) : (
                    <><Lock className="mr-1 h-3 w-3" />Cerrada</>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {reg.status === 'open' && reg.opened_at && (
                <p className="text-muted-foreground">
                  Abierta: {new Date(reg.opened_at).toLocaleString('es-NI', { timeZone: 'America/Managua' })}
                </p>
              )}
              {reg.initial_amount != null && (
                <p>Fondo Inicial: <span className="font-medium">{formatCurrency(reg.initial_amount)}</span></p>
              )}
            </CardContent>
            <CardFooter>
              <CashRegisterActions register={reg} />
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Active Shift Summaries */}
      {shiftSummaries.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Estado del Turno Actual</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {shiftSummaries.map(({ register, summary }, idx) => (
              <Card key={idx} className="border-2 border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Resumen: {register.name}</span>
                    <Badge variant="default">En curso</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Fondo Inicial</p>
                      <p className="font-medium font-mono">{formatCurrency(summary?.initialAmount || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Efectivo Esperado</p>
                      <p className="font-bold text-primary font-mono text-lg">{formatCurrency(summary?.expectedCash || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ventas Totales</p>
                      <p className="font-medium font-mono">{summary?.totalSalesCount || 0} ({formatCurrency(summary?.totalSalesAmount || 0)})</p>
                    </div>
                  </div>

                  {/* Delivery Tercero — solo visible si hay monto */}
                  {Number(summary?.totalExternalDelivery || 0) > 0 && (
                    <div className="flex items-center justify-between text-xs bg-amber-500/10 p-2 rounded-md border border-amber-500/20 text-amber-700 dark:text-amber-400">
                      <span className="font-medium">Delivery Tercero (Entregado al mensajero):</span>
                      <span className="font-mono font-bold">{formatCurrency(summary?.totalExternalDelivery || 0)}</span>
                    </div>
                  )}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Desglose de Ingresos</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Efectivo:</span>
                        <span className="font-mono">{formatCurrency(summary?.totalCash || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tarjeta:</span>
                        <span className="font-mono">{formatCurrency(summary?.totalCard || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Transferencia:</span>
                        <span className="font-mono">{formatCurrency(summary?.totalTransfer || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Otros:</span>
                        <span className="font-mono">{formatCurrency((summary?.totalMobile || 0) + (summary?.totalOther || 0))}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Global Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatCurrency(totalCash)}</p>
                <p className="text-xs text-muted-foreground">Ingresos (ventas en efectivo)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatCurrency(totalExpenses)}</p>
                <p className="text-xs text-muted-foreground">Egresos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div>
              <p className="text-xl font-bold">{formatCurrency(totalCash - totalExpenses)}</p>
              <p className="text-xs text-muted-foreground">Balance Neto</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movements */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <MovementsClient
            movements={movements}
            startDate={startDate}
            endDate={endDate}
          />
        </CardContent>
      </Card>
    </div>
  )
}
