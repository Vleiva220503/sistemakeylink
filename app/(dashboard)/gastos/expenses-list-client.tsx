'use client'

import { useState, useTransition } from 'react'
import { Receipt, Calendar, Search, Ban, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatCurrency, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cancelExpense } from '@/app/actions/crud'
import { ExpenseForm } from './expense-form'

interface Expense {
  id: string
  expense_date: string
  description: string
  amount: number
  is_cancelled: boolean
  category_id: string | null
  category?: {
    name: string
  } | null
}

interface ExpenseCategory {
  id: string
  name: string
}

interface ExpensesListClientProps {
  initialExpenses: Expense[]
  categories: ExpenseCategory[]
}

function CancelButton({ expense }: { expense: Expense }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelExpense(expense.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Gasto "${expense.description}" anulado correctamente.`)
        router.refresh()
      }
    })
  }

  if (expense.is_cancelled) {
    return (
      <Badge variant="destructive" className="text-[10px] font-mono px-2">
        Anulado
      </Badge>
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            disabled={isPending}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Anular gasto "${expense.description}"`}
            title="Anular gasto"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Ban className="h-4 w-4" />
            )}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Ban className="h-5 w-5 shrink-0" />
            ¿Anular este gasto?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de anular el gasto &quot;{expense.description}&quot; por{' '}
            <strong>{formatCurrency(Number(expense.amount))}</strong>. Este gasto no se
            eliminará, pero quedará marcado como anulado y será excluido de todos los
            cálculos y reportes. Esta acción es permanente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Anulando...
              </>
            ) : (
              'Sí, anular gasto'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ExpensesListClient({ initialExpenses, categories }: ExpensesListClientProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')

  const filteredExpenses = initialExpenses.filter((e) => {
    const searchLower = search.toLowerCase()
    const matchesSearch = e.description.toLowerCase().includes(searchLower)
    const matchesCategory = categoryFilter === 'all' || e.category_id === categoryFilter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && !e.is_cancelled) ||
      (statusFilter === 'cancelled' && e.is_cancelled)

    let matchesDate = true
    if (dateStart) matchesDate = matchesDate && e.expense_date >= dateStart
    if (dateEnd) matchesDate = matchesDate && e.expense_date <= dateEnd

    return matchesSearch && matchesCategory && matchesStatus && matchesDate
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>Registro de Gastos ({filteredExpenses.length})</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-wrap">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por descripción..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Date Inputs */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Input
                type="date"
                className="w-full sm:w-32 h-10 text-xs"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
              <span className="text-xs text-muted-foreground shrink-0">a</span>
              <Input
                type="date"
                className="w-full sm:w-32 h-10 text-xs"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || 'all')}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="cancelled">Anulados</SelectItem>
              </SelectContent>
            </Select>
            {(search || categoryFilter !== 'all' || statusFilter !== 'all' || dateStart || dateEnd) && (
              <button
                onClick={() => {
                  setSearch('')
                  setCategoryFilter('all')
                  setStatusFilter('all')
                  setDateStart('')
                  setDateEnd('')
                }}
                className="h-10 px-3 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border rounded-md bg-secondary/20 shrink-0 cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Receipt className="h-10 w-10 opacity-20" />
            <p>
              {search || categoryFilter !== 'all' || statusFilter !== 'all' || dateStart || dateEnd
                ? 'No se encontraron gastos con los filtros aplicados'
                : 'No hay gastos registrados'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< 768px) */}
            <div className="block md:hidden space-y-3">
              {filteredExpenses.map((e) => (
                <div
                  key={e.id}
                  className={cn(
                    'bg-background border border-border p-3.5 space-y-2.5 text-xs shadow-sm',
                    e.is_cancelled && 'opacity-50 border-destructive/30 bg-destructive/5'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                    <div>
                      <p className={cn('font-bold text-foreground text-sm', e.is_cancelled && 'line-through')}>
                        {e.description}
                      </p>
                      <p className="text-muted-foreground font-mono text-[11px]">
                        {new Date(e.expense_date).toLocaleDateString('es', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className={cn('font-mono font-bold text-sm', e.is_cancelled ? 'line-through text-muted-foreground' : 'text-destructive')}>
                      {formatCurrency(Number(e.amount))}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {e.category ? (
                        <Badge variant="secondary">{e.category.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {e.is_cancelled && (
                        <Badge variant="destructive" className="text-[10px]">Anulado</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!e.is_cancelled && <ExpenseForm expense={e} categories={categories} />}
                      <CancelButton expense={e} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Fecha</TableHead>
                    <TableHead className="whitespace-nowrap">Descripción</TableHead>
                    <TableHead className="whitespace-nowrap">Categoría</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Monto</TableHead>
                    <TableHead className="whitespace-nowrap">Estado</TableHead>
                    <TableHead className="whitespace-nowrap">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((e) => (
                    <TableRow
                      key={e.id}
                      className={cn(e.is_cancelled && 'opacity-50 bg-destructive/5')}
                    >
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(e.expense_date).toLocaleDateString('es', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </div>
                      </TableCell>
                      <TableCell className={cn('font-medium whitespace-nowrap', e.is_cancelled && 'line-through text-muted-foreground')}>
                        {e.description}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {e.category ? (
                          <Badge variant="secondary">{e.category.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className={cn('text-right font-bold whitespace-nowrap', e.is_cancelled ? 'line-through text-muted-foreground' : 'text-destructive')}>
                        {formatCurrency(Number(e.amount))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {e.is_cancelled ? (
                          <Badge variant="destructive" className="text-[10px]">Anulado</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Activo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {!e.is_cancelled && <ExpenseForm expense={e} categories={categories} />}
                          <CancelButton expense={e} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
