import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Calendar, FileText } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function HistorialCajaPage() {
  const supabase = await createClient()

  // Fetch the sessions
  // Usually this would have pagination or date filtering via searchParams, but for now we fetch the latest 50
  const { data: sessions, error } = await (supabase as any)
    .from('cash_register_sessions')
    .select(`
      *,
      register:cash_registers(name),
      opener:profiles!opened_by(full_name),
      closer:profiles!closed_by(full_name)
    `)
    .order('closed_at', { ascending: false, nullsFirst: false })
    .limit(50)

  const history = (sessions as any[]) || []

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Últimos Cierres Registrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              <p>Error al cargar el historial. Asegúrate de haber ejecutado la migración SQL de cash_register_sessions.</p>
              <p className="text-sm opacity-80">{error.message}</p>
            </div>
          ) : history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay cierres registrados aún.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha Cierre</TableHead>
                    <TableHead>Caja</TableHead>
                    <TableHead>Usuario (Apertura / Cierre)</TableHead>
                    <TableHead className="text-right">Ventas ($)</TableHead>
                    <TableHead className="text-right">Fondo</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="text-right">Contado</TableHead>
                    <TableHead className="text-right">Descuadre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-mono text-sm">
                        {session.closed_at ? new Date(session.closed_at).toLocaleString('es-NI') : '---'}
                      </TableCell>
                      <TableCell className="font-medium">{session.register?.name}</TableCell>
                      <TableCell className="text-xs">
                        <span className="text-muted-foreground">A:</span> {session.opener?.full_name || 'Desconocido'}<br/>
                        <span className="text-muted-foreground">C:</span> {session.closer?.full_name || 'Desconocido'}
                      </TableCell>
                      <TableCell className="text-right">
                        {session.total_sales_count} ventas<br/>
                        <span className="font-bold text-success">{formatCurrency(Number(session.total_sales_amount))}</span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(Number(session.initial_amount))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(session.expected_cash))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(session.counted_cash))}
                      </TableCell>
                      <TableCell className="text-right">
                        {session.difference !== null ? (
                          <Badge variant={session.difference === 0 ? 'default' : session.difference > 0 ? 'outline' : 'destructive'} 
                            className={session.difference > 0 ? 'text-success border-success bg-success/10' : ''}>
                            {session.difference > 0 ? '+' : ''}{formatCurrency(Number(session.difference))}
                          </Badge>
                        ) : '---'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
