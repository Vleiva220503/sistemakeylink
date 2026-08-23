'use client'

import { useState } from 'react'
import { Receipt, Calendar, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { ExpenseForm } from './expense-form'

interface Expense {
  id: string
  expense_date: string
  description: string
  amount: number
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

export function ExpensesListClient({ initialExpenses, categories }: ExpensesListClientProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')

  const filteredExpenses = initialExpenses.filter((e) => {
    // 1. Search text
    const searchLower = search.toLowerCase()
    const matchesSearch = e.description.toLowerCase().includes(searchLower)

    // 2. Category filter
    const matchesCategory =
      categoryFilter === 'all' || e.category_id === categoryFilter

    // 3. Date range filter
    let matchesDate = true
    if (dateStart) {
      matchesDate = matchesDate && e.expense_date >= dateStart
    }
    if (dateEnd) {
      matchesDate = matchesDate && e.expense_date <= dateEnd
    }

    return matchesSearch && matchesCategory && matchesDate
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>Registro de Gastos ({filteredExpenses.length})</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
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
                placeholder="Desde"
                className="w-full sm:w-32 h-10 text-xs"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
              <span className="text-xs text-muted-foreground shrink-0">a</span>
              <Input
                type="date"
                placeholder="Hasta"
                className="w-full sm:w-32 h-10 text-xs"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
            {/* Category Filter */}
            <Select
              value={categoryFilter}
              onValueChange={(val) => setCategoryFilter(val || 'all')}
            >
              <SelectTrigger className="w-full sm:w-48">
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
            {(search || categoryFilter !== 'all' || dateStart || dateEnd) && (
              <button
                onClick={() => {
                  setSearch('')
                  setCategoryFilter('all')
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
              {search || categoryFilter !== 'all' || dateStart || dateEnd
                ? 'No se encontraron gastos con los filtros aplicados'
                : 'No hay gastos registrados'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(e.expense_date).toLocaleDateString('es', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{e.description}</TableCell>
                  <TableCell>
                    {e.category ? (
                      <Badge variant="secondary">{e.category.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold text-destructive">
                    {formatCurrency(Number(e.amount))}
                  </TableCell>
                  <TableCell>
                    <ExpenseForm expense={e} categories={categories} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
