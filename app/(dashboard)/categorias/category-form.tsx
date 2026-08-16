'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createCategory, updateCategory } from '@/app/actions/crud'

interface Category {
  id?: string
  name?: string
  description?: string | null
}

export function CategoryForm({ category }: { category?: Category }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isEdit = !!category?.id

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = isEdit
        ? await updateCategory(category!.id!, formData)
        : await createCategory(formData)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(isEdit ? 'Categoría actualizada' : 'Categoría creada')
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
          ) : (
            <Button style={{ color: 'hsl(var(--primary-foreground))' }}>
              <Plus className="mr-2 h-4 w-4" />Nueva Categoría
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nombre *</label>
            <Input name="name" defaultValue={category?.name} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descripción</label>
            <Input name="description" defaultValue={category?.description || ''} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending} style={{ color: 'hsl(var(--primary-foreground))' }}>
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Guardar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
