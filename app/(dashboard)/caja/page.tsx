import { createClient } from '@/lib/supabase/server'
import { DollarSign, CreditCard, Lock, Unlock, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { CashRegisterActions } from './cash-register-actions'

export default async function CajaPage() {
  const supabase = await createClient()

  const [{ data: regRows }, { data: movRows }] = await Promise.all([
    (supabase as any).from('cash_registers').select('*').order('name'),
    (supabase as any).from('cash_movements')
      .select('*, register:cash_registers(name)')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const registers = (regRows as any[]) || []
  const movements = (movRows as any[]) || []

  const totalCash = movements
    .filter((m: any) => m.type === 'sale')
    .reduce((sum: number, m: any) => sum + Number(m.amount), 0)

  const totalExpenses = movements
    .filter((m: any) => m.type === 'expense')
    .reduce((sum: number, m: any) => sum + Number(m.amount), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Caja</h1>
        <p className="text-muted-foreground">Control de cajas registradoras y movimientos</p>
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
                  Abierta: {new Date(reg.opened_at).toLocaleString('es')}
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

      {/* Summary */}
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
          {movements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Sin movimientos registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Caja</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(m.created_at).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-sm">{m.register?.name}</TableCell>
                    <TableCell>
                      <Badge variant={m.type === 'sale' || m.type === 'income' ? 'default' : 'destructive'} className="capitalize">
                        {m.type === 'sale' ? 'Venta' : m.type === 'expense' ? 'Gasto' : m.type === 'income' ? 'Ingreso' : 'Ajuste'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{m.description || '—'}</TableCell>
                    <TableCell className={`text-right font-bold ${m.type === 'sale' || m.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                      {m.type === 'sale' || m.type === 'income' ? '+' : '-'}{formatCurrency(Number(m.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
