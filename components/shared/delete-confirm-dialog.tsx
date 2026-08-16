'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { toast } from 'sonner'

interface DeleteWithConfirmProps {
  /** Display name of the item being deleted (e.g. "Zapatillas Nike") */
  itemName: string
  /** Human-readable type label (e.g. "categoría", "marca", "producto") */
  itemType: string
  /**
   * Number of active products linked to this item.
   * If > 0, the delete button is disabled with a tooltip.
   */
  productCount?: number
  /**
   * Total stock units for this product.
   * If > 0, the delete button is disabled with a tooltip.
   */
  stockAmount?: number
  /** Server action to call on confirmation. Must return { error?, success? } */
  onConfirm: () => Promise<{
    error?: string
    success?: boolean
    blocked?: boolean
    productCount?: number
    stockAmount?: number
  }>
  size?: 'sm' | 'default' | 'icon'
  variant?: 'ghost' | 'destructive' | 'outline'
  className?: string
}

export function DeleteWithConfirm({
  itemName,
  itemType,
  productCount,
  stockAmount,
  onConfirm,
  size = 'icon',
  variant = 'ghost',
  className = '',
}: DeleteWithConfirmProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  // Determine if the button should be blocked upfront (from pre-fetched data)
  const isBlockedByProducts = productCount !== undefined && productCount > 0
  const isBlockedByStock = stockAmount !== undefined && stockAmount > 0
  const isBlocked = isBlockedByProducts || isBlockedByStock

  const blockReason = isBlockedByProducts
    ? `Tiene ${productCount} producto${productCount! > 1 ? 's' : ''} activo${productCount! > 1 ? 's' : ''} asociado${productCount! > 1 ? 's' : ''}. Elimínalos primero.`
    : isBlockedByStock
    ? `Tiene ${stockAmount} unidad${stockAmount! > 1 ? 'es' : ''} en stock. Ajusta el stock a 0 primero.`
    : ''

  function handleConfirm() {
    startTransition(async () => {
      try {
        const result = await onConfirm()
        if (result?.error) {
          toast.error(result.error)
          setOpen(false)
        } else if (result?.success) {
          toast.success(
            `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} "${itemName}" eliminado correctamente.`
          )
          setOpen(false)
          router.refresh()
        }
      } catch {
        toast.error(
          'Ocurrió un error inesperado al intentar eliminar. Intenta de nuevo.'
        )
        setOpen(false)
      }
    })
  }

  // Blocked: show disabled button with native tooltip
  if (isBlocked) {
    return (
      <div title={blockReason} className="inline-block">
        <Button
          variant={variant}
          size={size}
          disabled
          className={`cursor-not-allowed opacity-40 ${className}`}
          aria-label={`No se puede eliminar: ${blockReason}`}
          tabIndex={-1}
        >
          <ShieldAlert className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {/* Base UI AlertDialogTrigger uses render= instead of asChild */}
      <AlertDialogTrigger
        render={
          <Button
            id={`delete-${itemType.replace(/\s+/g, '-')}-btn`}
            variant={variant}
            size={size}
            className={variant === 'destructive'
              ? `bg-destructive text-destructive-foreground hover:bg-destructive/90 ${className}`
              : `text-destructive hover:bg-destructive/10 hover:text-destructive ${className}`
            }
            disabled={isPending}
            aria-label={`Eliminar ${itemType} "${itemName}"`}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        }
      />

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            ¿Eliminar {itemType}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de eliminar &quot;{itemName}&quot;. Esta acción no se
            puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e: React.MouseEvent) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              'Sí, eliminar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
