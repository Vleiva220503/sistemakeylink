import { createClient } from '@/lib/supabase/server'
import { DollarSign, Receipt, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { ExpenseForm } from './expense-form'
import { ExpensesListClient } from './expenses-list-client'

export default async function GastosPage() {
  const supabase = await createClient()

  const [{ data: expRows }, { data: catRows }] = await Promise.all([
    (supabase as any).from('expenses').select(`
      *, category:expense_categories(name)
    `).order('expense_date', { ascending: false }).limit(100),
    (supabase as any).from('expense_categories').select('*').eq('is_active', true).order('name'),
  ])

  const expenses = (expRows as any[]) || []
  const categories = (catRows as any[]) || []

  const totalMonth = expenses
    .filter((e: any) => new Date(e.expense_date).getMonth() === new Date().getMonth())
    .reduce((sum: number, e: any) => sum + Number(e.amount), 0)

  const totalTotal = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)

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

      <ExpensesListClient initialExpenses={expenses} categories={categories} />
    </div>
  )
}
