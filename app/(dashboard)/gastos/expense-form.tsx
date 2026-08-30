'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createExpense, updateExpense } from '@/app/actions/crud'

export function ExpenseForm({ expense, categories }: { expense?: any; categories: any[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isEdit = !!expense?.id

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = isEdit
        ? await updateExpense(expense.id, formData)
        : await createExpense(formData)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(isEdit ? 'Gasto actualizado' : 'Gasto registrado')
        setOpen(false)
      }
    })
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
          ) : (
            <Button style={{ color: 'hsl(var(--primary-foreground))' }}><Plus className="mr-2 h-4 w-4" />Registrar Gasto</Button>
          )
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Gasto' : 'Nuevo Gasto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descripción *</label>
            <Input name="description" defaultValue={expense?.description} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Monto *</label>
              <Input name="amount" type="number" step="0.01" min="0" defaultValue={expense?.amount} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha *</label>
              <Input name="expense_date" type="date" defaultValue={expense?.expense_date || today} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Categoría</label>
            <select name="category_id" defaultValue={expense?.category_id || ''}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Sin categoría</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notas</label>
            <Input name="notes" defaultValue={expense?.notes} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending} style={{ color: 'hsl(var(--primary-foreground))' }}>
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Guardar Gasto'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
