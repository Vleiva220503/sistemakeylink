'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Unlock, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { openRegister, closeRegister } from '@/app/actions/cash-register'

export function CashRegisterActions({ register }: { register: any }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const isOpen = register.status === 'open'

  async function handleOpen(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await openRegister(register.id, Number(fd.get('initial_amount')))
    setLoading(false)
    if (result?.error) { toast.error(result.error) }
    else { toast.success('Caja abierta'); setOpen(false); router.refresh() }
  }

  async function handleClose(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const counted = Number(fd.get('counted_cash'))
    const expected = Number(fd.get('expected_cash'))
    const result = await closeRegister(register.id, counted, expected, fd.get('notes') as string)
    setLoading(false)
    if (result?.error) { toast.error(result.error) }
    else { toast.success('Caja cerrada correctamente'); setOpen(false); router.refresh() }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isOpen ? (
            <Button variant="destructive" size="sm" className="w-full">
              <Lock className="mr-2 h-4 w-4" />Cerrar Caja
            </Button>
          ) : (
            <Button variant="default" size="sm" className="w-full">
              <Unlock className="mr-2 h-4 w-4" />Abrir Caja
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isOpen ? `Cerrar ${register.name}` : `Abrir ${register.name}`}</DialogTitle>
        </DialogHeader>

        {isOpen ? (
          <form onSubmit={handleClose} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Efectivo esperado en caja *</label>
              <Input name="expected_cash" type="number" step="0.01" defaultValue={0} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Efectivo contado *</label>
              <Input name="counted_cash" type="number" step="0.01" defaultValue={0} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notas</label>
              <Input name="notes" placeholder="Observaciones del cierre..." />
            </div>
            <Button type="submit" variant="destructive" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cerrando...</> : 'Confirmar Cierre'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOpen} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fondo inicial en efectivo *</label>
              <Input name="initial_amount" type="number" step="0.01" defaultValue={0} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Abriendo...</> : 'Confirmar Apertura'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
