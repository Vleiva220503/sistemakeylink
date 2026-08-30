'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createBrand, updateBrand } from '@/app/actions/crud'

interface Brand {
  id?: string
  name?: string
  description?: string | null
  logo_url?: string | null
}

export function BrandForm({ brand }: { brand?: Brand }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isEdit = !!brand?.id

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = isEdit
        ? await updateBrand(brand!.id!, formData)
        : await createBrand(formData)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(isEdit ? 'Marca actualizada' : 'Marca creada')
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="ghost" size="sm" className="h-9 px-3"><Pencil className="h-4 w-4" /></Button>
          ) : (
            <Button style={{ color: 'hsl(var(--primary-foreground))' }}>
              <Plus className="mr-2 h-4 w-4" />Nueva Marca
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Marca' : 'Nueva Marca'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nombre *</label>
            <Input name="name" defaultValue={brand?.name} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descripción</label>
            <Input name="description" defaultValue={brand?.description || ''} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">URL del Logo</label>
            <Input name="logo_url" type="url" defaultValue={brand?.logo_url || ''} placeholder="https://..." />
          </div>
          <Button type="submit" className="w-full" disabled={isPending} style={{ color: 'hsl(var(--primary-foreground))' }}>
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Guardar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
