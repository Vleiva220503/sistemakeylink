'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createCustomer, updateCustomer } from '@/app/actions/crud'

export function ClientForm({ customer }: { customer?: any }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isEdit = !!customer?.id

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = isEdit
        ? await updateCustomer(customer.id, formData)
        : await createCustomer(formData)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(isEdit ? 'Cliente actualizado' : 'Cliente creado')
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
            <Button style={{ color: 'hsl(var(--primary-foreground))' }}><Plus className="mr-2 h-4 w-4" />Nuevo Cliente</Button>
          )
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nombre *</label>
            <Input name="name" defaultValue={customer?.name} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input name="email" type="email" defaultValue={customer?.email} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Teléfono</label>
              <Input name="phone" defaultValue={customer?.phone} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Dirección</label>
            <Input name="address" defaultValue={customer?.address} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Límite de Crédito</label>
            <Input name="credit_limit" type="number" step="0.01" min="0" defaultValue={customer?.credit_limit ?? 0} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notas</label>
            <Input name="notes" defaultValue={customer?.notes} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending} style={{ color: 'hsl(var(--primary-foreground))' }}>
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Guardar Cliente'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
