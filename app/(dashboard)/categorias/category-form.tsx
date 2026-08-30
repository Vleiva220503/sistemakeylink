'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Loader2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createCategory, updateCategory, checkCategoryNameExists, reactivateCategory } from '@/app/actions/crud'

interface Category {
  id?: string
  name?: string
  description?: string | null
}

type NameStatus = 'idle' | 'checking' | 'ok' | 'duplicate_inactive' | 'duplicate_active'

const DEBOUNCE_MS = 700

export function CategoryForm({ category }: { category?: Category }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isEdit = !!category?.id

  // ── Name duplicate check state ────────────────────────────────────────────────
  const [catName, setCatName] = useState(category?.name || '')
  const [nameStatus, setNameStatus] = useState<NameStatus>('idle')
  const [duplicateId, setDuplicateId] = useState<string | null>(null)
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset on dialog open
  useEffect(() => {
    if (open) {
      setCatName(category?.name || '')
      setNameStatus('idle')
      setDuplicateId(null)
    }
  }, [open, category?.name])

  // Debounced name check
  useEffect(() => {
    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current)

    const trimmed = catName.trim()

    if (!trimmed || (isEdit && trimmed.toLowerCase() === (category?.name || '').toLowerCase())) {
      setNameStatus('idle')
      setDuplicateId(null)
      return
    }

    setNameStatus('checking')

    nameDebounceRef.current = setTimeout(async () => {
      const result = await checkCategoryNameExists(trimmed, isEdit ? category?.id : undefined)
      if (!result.exists) {
        setNameStatus('ok')
        setDuplicateId(null)
      } else if (result.isInactive) {
        setNameStatus('duplicate_inactive')
        setDuplicateId(result.id)
      } else {
        setNameStatus('duplicate_active')
        setDuplicateId(result.id)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current)
    }
  }, [catName, isEdit, category?.id, category?.name])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (nameStatus === 'checking') {
      toast.warning('Espera a que se verifique el nombre de la talla.')
      return
    }
    if (nameStatus === 'duplicate_active' || nameStatus === 'duplicate_inactive') {
      toast.error('Ya existe una talla con ese nombre.')
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('name', catName.trim())

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

  function handleReactivate() {
    if (!duplicateId) return
    startTransition(async () => {
      const result = await reactivateCategory(duplicateId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Talla reactivada correctamente')
        setOpen(false)
      }
    })
  }

  const saveDisabled =
    isPending ||
    nameStatus === 'checking' ||
    nameStatus === 'duplicate_active' ||
    nameStatus === 'duplicate_inactive'

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
              value={catName}
              onChange={(e) => {
                // Permite números y un punto o coma decimal
                const val = e.target.value.replace(/[^0-9.,]/g, '')
                setCatName(val)
              }}
              placeholder="Ej: 38, 39, 40.5"
              required
              title="Por favor ingresa un número de talla válido (ej: 38, 39.5)"
            />
            <p className="text-[11px] text-muted-foreground">
              Ingresa el número de talla (ej. 37, 38, 39.5, 40).
            </p>

            {/* Name status feedback */}
            {nameStatus === 'checking' && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Verificando talla...
              </p>
            )}

            {/* Duplicate INACTIVE — warning (informative) */}
            {nameStatus === 'duplicate_inactive' && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-warning/10 border border-warning/30 text-warning">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug font-semibold">Ya existe una talla inactiva con este número.</p>
                  <p className="text-xs leading-snug mt-0.5 text-warning/80">¿Quieres reactivarla en su lugar?</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 text-xs gap-1"
                    disabled={isPending}
                    onClick={handleReactivate}
                  >
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Reactivar talla existente
                  </Button>
                </div>
              </div>
            )}

            {/* Duplicate ACTIVE — error (blocking) */}
            {nameStatus === 'duplicate_active' && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive">
                <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <p className="text-xs leading-snug">Ya existe una talla activa con este número. Usa un número diferente.</p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Descripción (opcional)</label>
            <Input name="description" defaultValue={category?.description || ''} placeholder="Ej: Talla dama / caballero" />
          </div>

          <Button
            type="submit"
            className="w-full uppercase font-bold tracking-wider"
            disabled={saveDisabled}
            style={{ color: 'hsl(var(--primary-foreground))' }}
          >
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Guardar Talla'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
