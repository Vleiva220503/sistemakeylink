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
        toast.success(isEdit ? 'Talla actualizada' : 'Talla creada')
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
              <Plus className="mr-2 h-4 w-4" />Nueva Talla
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Talla' : 'Nueva Talla'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Talla *</label>
            <Input
              name="name"
              type="text"
              inputMode="decimal"
              defaultValue={category?.name}
              placeholder="Ej: 38, 39, 40.5"
              required
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                // Permite números y un punto o coma decimal
                const input = e.currentTarget
                input.value = input.value.replace(/[^0-9.,]/g, '')
              }}
              title="Por favor ingresa un número de talla válido (ej: 38, 39.5)"
            />
            <p className="text-[11px] text-muted-foreground">
              Ingresa el número de talla (ej. 37, 38, 39.5, 40).
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Descripción (opcional)</label>
            <Input name="description" defaultValue={category?.description || ''} placeholder="Ej: Talla dama / caballero" />
          </div>
          <Button type="submit" className="w-full uppercase font-bold tracking-wider" disabled={isPending} style={{ color: 'hsl(var(--primary-foreground))' }}>
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Guardar Talla'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
