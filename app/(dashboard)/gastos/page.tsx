import { createClient } from '@/lib/supabase/server'
import { DollarSign, Receipt, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { ExpenseForm } from './expense-form'
import { ExpensesListClient } from './expenses-list-client'

const PAGE_SIZE = 50

export default async function GastosPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const supabase = await createClient()
  const { page: pageParam } = await searchParams
  const currentPage = Math.max(0, parseInt(pageParam || '0', 10))
  const from = currentPage * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const [{ data: expRows, count: totalCount }, { data: catRows }] = await Promise.all([
    (supabase as any).from('expenses').select(`
      *, category:expense_categories(name)
    `, { count: 'exact' }).order('expense_date', { ascending: false }).range(from, to),
    (supabase as any).from('expense_categories').select('*').eq('is_active', true).order('name'),
  ])

  const expenses = (expRows as any[]) || []
  const categories = (catRows as any[]) || []
  const safeTotal = totalCount ?? 0

  // Lightweight query for full KPIs
  const { data: kpiRows } = await (supabase as any).from('expenses')
    .select('is_cancelled, expense_date, amount')
  const kpiExpenses = (kpiRows as any[]) || []
  const activeExpenses = kpiExpenses.filter((e: any) => !e.is_cancelled)

  const totalMonth = activeExpenses
    .filter((e: any) => new Date(e.expense_date).getMonth() === new Date().getMonth()
      && new Date(e.expense_date).getFullYear() === new Date().getFullYear())
    .reduce((sum: number, e: any) => sum + Number(e.amount), 0)

  const totalTotal = activeExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Gastos</h1>
          <p className="text-muted-foreground">Control de gastos operativos</p>
        </div>
        <ExpenseForm categories={categories} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatCurrency(totalMonth)}</p>
                <p className="text-xs text-muted-foreground">Gastos del Mes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{expenses.length}</p>
                <p className="text-xs text-muted-foreground">Total Registros</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatCurrency(totalTotal)}</p>
                <p className="text-xs text-muted-foreground">Gastos Acumulados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ExpensesListClient initialExpenses={expenses} categories={categories} totalCount={safeTotal} currentPage={currentPage} pageSize={PAGE_SIZE} />
    </div>
  )
}
