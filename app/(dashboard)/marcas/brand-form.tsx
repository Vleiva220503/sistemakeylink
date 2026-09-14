'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Loader2, CheckCircle2, XCircle, ImageIcon, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createBrand, updateBrand, checkBrandNameExists, reactivateBrand } from '@/app/actions/crud'
import { SafeImage } from '@/components/shared/safe-image'

interface Brand {
  id?: string
  name?: string
  description?: string | null
  logo_url?: string | null
}

type UrlStatus = 'idle' | 'checking' | 'valid' | 'invalid'
type NameStatus = 'idle' | 'checking' | 'ok' | 'duplicate_inactive' | 'duplicate_active'

const DEBOUNCE_MS = 700

async function validateImageUrl(url: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    const res = await fetch(`/api/validate-image?url=${encodeURIComponent(url)}`)
    if (!res.ok) return { valid: false, reason: 'Error al verificar la URL' }
    return await res.json()
  } catch {
    return { valid: false, reason: 'No se pudo verificar la URL' }
  }
}

export function BrandForm({ brand }: { brand?: Brand }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isEdit = !!brand?.id

  // ── URL validation state ─────────────────────────────────────────────────────
  const [logoUrl, setLogoUrl] = useState(brand?.logo_url || '')
  const [urlStatus, setUrlStatus] = useState<UrlStatus>('idle')
  const [urlReason, setUrlReason] = useState<string>('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Name duplicate check state ────────────────────────────────────────────────
  const [brandName, setBrandName] = useState(brand?.name || '')
  const [nameStatus, setNameStatus] = useState<NameStatus>('idle')
  const [duplicateId, setDuplicateId] = useState<string | null>(null)
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // When the dialog opens, reset all state to current brand values
  useEffect(() => {
    if (open) {
      setLogoUrl(brand?.logo_url || '')
      setUrlStatus('idle')
      setUrlReason('')
      setBrandName(brand?.name || '')
      setNameStatus('idle')
      setDuplicateId(null)
    }
  }, [open, brand?.logo_url, brand?.name])

  // Debounced name duplicate check
  useEffect(() => {
    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current)

    const trimmed = brandName.trim()

    // Skip check when editing and name hasn't changed
    if (!trimmed || (isEdit && trimmed.toLowerCase() === (brand?.name || '').toLowerCase())) {
      setNameStatus('idle')
      setDuplicateId(null)
      return
    }

    setNameStatus('checking')

    nameDebounceRef.current = setTimeout(async () => {
      const result = await checkBrandNameExists(trimmed, isEdit ? brand?.id : undefined)
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
  }, [brandName, isEdit, brand?.id, brand?.name])

  // Debounced URL validation
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = logoUrl.trim()

    if (!trimmed) {
      setUrlStatus('idle')
      setUrlReason('')
      return
    }

    try {
      new URL(trimmed)
    } catch {
      setUrlStatus('invalid')
      setUrlReason('La URL no tiene un formato válido.')
      return
    }

    setUrlStatus('checking')
    setUrlReason('')

    debounceRef.current = setTimeout(async () => {
      const result = await validateImageUrl(trimmed)
      if (result.valid) {
        setUrlStatus('valid')
        setUrlReason('')
      } else {
        setUrlStatus('invalid')
        setUrlReason(result.reason || 'Esta URL de imagen no es accesible o no es válida.')
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [logoUrl])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (nameStatus === 'checking') {
      toast.warning('Espera a que se verifique el nombre de la marca.')
      return
    }
    if (nameStatus === 'duplicate_active' || nameStatus === 'duplicate_inactive') {
      toast.error('Ya existe una marca con ese nombre.')
      return
    }

    if (urlStatus === 'checking') {
      toast.warning('Espera a que se termine de verificar la URL de imagen.')
      return
    }
    if (urlStatus === 'invalid') {
      toast.error('La URL de imagen no es válida. Corrígela antes de guardar.')
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('logo_url', logoUrl.trim())
    formData.set('name', brandName.trim())

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

  function handleReactivate() {
    if (!duplicateId) return
    startTransition(async () => {
      const result = await reactivateBrand(duplicateId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Marca reactivada correctamente')
        setOpen(false)
      }
    })
  }

  const saveDisabled =
    isPending ||
    nameStatus === 'checking' ||
    nameStatus === 'duplicate_active' ||
    nameStatus === 'duplicate_inactive' ||
    urlStatus === 'checking' ||
    (urlStatus === 'invalid' && logoUrl.trim().length > 0)

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
            <Input
              name="name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              required
            />

            {/* Name status feedback */}
            {nameStatus === 'checking' && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Verificando nombre...
              </p>
            )}

            {/* Duplicate INACTIVE — warning (informative) */}
            {nameStatus === 'duplicate_inactive' && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-warning/10 border border-warning/30 text-warning">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug font-semibold">Ya existe una marca inactiva con este nombre.</p>
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
                    Reactivar marca existente
                  </Button>
                </div>
              </div>
            )}

            {/* Duplicate ACTIVE — error (blocking) */}
            {nameStatus === 'duplicate_active' && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive">
                <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <p className="text-xs leading-snug">Ya existe una marca activa con este nombre. Usa un nombre diferente.</p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descripción</label>
            <Input name="description" defaultValue={brand?.description || ''} />
          </div>

          {/* ── URL del Logo con validación ────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">URL del Logo</label>
            <div className="relative">
              <Input
                name="logo_url"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className={
                  urlStatus === 'valid'
                    ? 'border-green-500 pr-9'
                    : urlStatus === 'invalid'
                    ? 'border-destructive pr-9'
                    : 'pr-9'
                }
              />
              {/* Status icon inside the input */}
              <div className="absolute right-2.5 top-2.5 pointer-events-none">
                {urlStatus === 'checking' && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {urlStatus === 'valid' && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {urlStatus === 'invalid' && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
            </div>

            {/* Validation feedback messages */}
            {urlStatus === 'checking' && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Verificando que la imagen sea accesible...
              </p>
            )}
            {urlStatus === 'invalid' && urlReason && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <p className="text-xs leading-snug">{urlReason}</p>
              </div>
            )}
            {urlStatus === 'valid' && (
              <p className="text-xs text-green-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                La imagen es accesible y válida.
              </p>
            )}
          </div>

          {/* ── Previsualización de imagen (solo si URL válida) ────────────── */}
          {urlStatus === 'valid' && logoUrl.trim() && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                Previsualización — confirma que es la imagen correcta
              </label>
              <div className="w-full h-40 border-2 border-green-500/40 bg-white rounded-lg flex items-center justify-center p-3 overflow-hidden shadow-inner">
                <SafeImage
                  src={logoUrl.trim()}
                  alt="Previsualización del logo"
                  className="object-contain max-h-full max-w-full"
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={saveDisabled}
            style={{ color: 'hsl(var(--primary-foreground))' }}
          >
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
            ) : urlStatus === 'checking' ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando imagen...</>
            ) : (
              'Guardar'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
