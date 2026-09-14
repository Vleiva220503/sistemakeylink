'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteRecord } from '@/app/actions/crud'
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

interface Props {
  id: string
  table: string
  redirectPath: string
  softDelete?: boolean
}

export function DeleteButton({ id, table, redirectPath, softDelete = true }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteRecord(table, id, softDelete)
      if (result.error) {
        toast.error('No se pudo eliminar: ' + result.error)
      } else {
        toast.success('Eliminado correctamente')
        router.push(redirectPath)
        router.refresh()
      }
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" disabled={isPending}>
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer fácilmente. El registro quedará inactivo o eliminado en el sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Sí, eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
