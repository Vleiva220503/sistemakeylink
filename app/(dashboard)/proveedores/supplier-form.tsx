'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createSupplier, updateSupplier } from '@/app/actions/crud'

export function SupplierForm({ supplier }: { supplier?: any }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isEdit = !!supplier?.id

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = isEdit
        ? await updateSupplier(supplier.id, formData)
        : await createSupplier(formData)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(isEdit ? 'Proveedor actualizado' : 'Proveedor creado')
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="outline" size="sm"><Pencil className="mr-2 h-3.5 w-3.5" />Editar</Button>
          ) : (
            <Button style={{ color: 'hsl(var(--primary-foreground))' }}><Plus className="mr-2 h-4 w-4" />Nuevo Proveedor</Button>
          )
        }
      />
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nombre Comercial *</label>
            <Input name="name" defaultValue={supplier?.name} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contacto</label>
              <Input name="contact_name" defaultValue={supplier?.contact_name} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Teléfono</label>
              <Input name="phone" defaultValue={supplier?.phone} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium">Email</label>
              <Input name="email" type="email" defaultValue={supplier?.email} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Dirección</label>
            <Input name="address" defaultValue={supplier?.address} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notas</label>
            <Input name="notes" defaultValue={supplier?.notes} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending} style={{ color: 'hsl(var(--primary-foreground))' }}>
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Guardar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
