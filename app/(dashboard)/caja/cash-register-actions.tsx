'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Unlock, Lock, Loader2, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { openRegister, closeRegister, getCurrentShiftSummary } from '@/app/actions/cash-register'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

/**
 * Visibility rules for the register buttons:
 *
 * CAJA CERRADA:
 *   - Usuario sin ninguna caja abierta → "Abrir Caja" habilitado
 *   - Usuario con otra caja ya abierta → "Abrir Caja" deshabilitado + tooltip
 *   - (El backend también rechaza con 23505 como red de seguridad)
 *
 * CAJA ABIERTA POR MÍ:
 *   - Botón "Cerrar Caja" visible y habilitado
 *
 * CAJA ABIERTA POR OTRO:
 *   - Ningún botón de acción; mensaje informativo de quién la tiene
 *
 * ADMIN:
 *   - Puede cerrar cualquier caja abierta (sin importar quién la abrió)
 *   - Puede abrir cualquier caja cerrada
 */
export function CashRegisterActions({
  register,
  isAdmin = false,
  currentUserId,
  myOpenRegisterName,
}: {
  register: any
  isAdmin?: boolean
  currentUserId?: string
  /** Name of the register already opened by this user, if any (null if none) */
  myOpenRegisterName?: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [expectedCash, setExpectedCash] = useState<number | null>(null)
  const [countedCash, setCountedCash] = useState<number | ''>('')

  const isOpen = register.status === 'open'
  const isMyRegister = currentUserId && register.opened_by === currentUserId

  // --- Derived flags for each scenario ---

  // Caja abierta por mí → puedo cerrarla
  const canClose = isOpen && (isAdmin || isMyRegister)

  // Caja abierta por alguien distinto → solo info, sin acción
  const openedByOther = isOpen && !isMyRegister && !isAdmin

  // Caja cerrada → cualquier usuario activo puede intentar abrirla,
  // salvo que ya tenga otra caja abierta (el backend lo rechaza con 23505;
  // aquí lo mostramos deshabilitado con mensaje claro).
  const hasAnotherOpen = !isOpen && Boolean(myOpenRegisterName) && myOpenRegisterName !== register.name
  const canOpen = !isOpen && !hasAnotherOpen

  // Fetch expected cash when the close dialog opens
  useEffect(() => {
    async function fetchSummary() {
      if (open && isOpen && canClose) {
        setLoadingSummary(true)
        const res = await getCurrentShiftSummary(register.id)
        setLoadingSummary(false)
        if (res.success && res.data) {
          setExpectedCash(res.data.expectedCash)
        } else {
          toast.error(res.error || 'No se pudo calcular el efectivo esperado')
        }
      } else {
        setExpectedCash(null)
        setCountedCash('')
      }
    }
    fetchSummary()
  }, [open, isOpen, canClose, register.id])

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
    if (expectedCash === null) return toast.error('No se ha calculado el efectivo esperado')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const counted = Number(fd.get('counted_cash'))
    const result = await closeRegister(register.id, counted, expectedCash, fd.get('notes') as string)
    setLoading(false)
    if (result?.error) { toast.error(result.error) }
    else { toast.success('Caja cerrada correctamente'); setOpen(false); router.refresh() }
  }

  const difference = countedCash !== '' && expectedCash !== null
    ? Number(countedCash) - expectedCash
    : null

  // --- Case: open by another user → no action buttons ---
  if (openedByOther) {
    return (
      <p className="text-xs text-muted-foreground w-full text-center py-1">
        Abierta por otro usuario
      </p>
    )
  }

  // --- Case: closed but user already has a different register open ---
  if (hasAnotherOpen) {
    return (
      <Button variant="outline" size="sm" className="w-full" disabled title={`Ya tienes ${myOpenRegisterName} abierta`}>
        <Lock className="mr-2 h-4 w-4" />
        Ya tienes {myOpenRegisterName} abierta
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isOpen ? (
            // Can always render close if canClose (my register or admin)
            <Button variant="destructive" size="sm" className="w-full">
              <Lock className="mr-2 h-4 w-4" />Cerrar Caja
            </Button>
          ) : (
            // Closed register — can open (canOpen already guaranteed above)
            <Button variant="default" size="sm" className="w-full" disabled={!canOpen}>
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
            <div className="space-y-1.5 p-3 bg-muted/50 rounded-lg border border-border">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calculator className="h-4 w-4" /> Efectivo esperado en caja
              </label>
              {loadingSummary ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Calculando ventas del turno...
                </div>
              ) : (
                <p className="text-2xl font-bold font-mono">
                  {expectedCash !== null ? formatCurrency(expectedCash) : '---'}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Efectivo real (contado) *</label>
              <Input
                name="counted_cash"
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>

            {difference !== null && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <span className="text-sm font-medium">Diferencia (Descuadre):</span>
                <Badge
                  variant={difference === 0 ? 'default' : difference > 0 ? 'outline' : 'destructive'}
                  className={difference > 0 ? 'text-success border-success bg-success/10' : ''}
                >
                  {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                </Badge>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notas</label>
              <Input name="notes" placeholder="Observaciones del cierre..." />
            </div>
            <Button type="submit" variant="destructive" className="w-full" disabled={loading || loadingSummary || expectedCash === null}>
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
