'use client'

import { useState } from 'react'
import { Tag, Search, X, ImageOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { BrandForm } from './brand-form'
import { DeleteWithConfirm } from '@/components/shared/delete-confirm-dialog'
import { deleteBrand } from '@/app/actions/crud'

interface BrandItem {
  id: string
  name: string
  slug: string
  description?: string | null
  logo_url?: string | null
  is_active: boolean
}

interface BrandsListClientProps {
  brands: BrandItem[]
  productCountByBrand: Record<string, number>
}

// ─── Image Lightbox Modal ──────────────────────────────────────────────────────
function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string
  alt: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-card rounded-2xl shadow-2xl p-4 max-w-lg w-[90vw] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          aria-label="Cerrar previsualización"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Image */}
        <div className="flex items-center justify-center min-h-[200px]">
          <img
            src={src}
            alt={alt}
            className="max-h-[60vh] max-w-full object-contain rounded-lg"
          />
        </div>

        <p className="text-center text-sm font-semibold text-foreground mt-3">{alt}</p>
        <p className="text-center text-xs text-muted-foreground mt-0.5">
          Imagen del logo / imagen de marca
        </p>
      </div>
    </div>
  )
}

// ─── Brand Card ────────────────────────────────────────────────────────────────
function BrandCard({
  b,
  count,
  onImageClick,
}: {
  b: BrandItem
  count: number
  onImageClick: (src: string, alt: string) => void
}) {
  return (
    <Card className="relative hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col">
      {/* ── Image area — full width, fixed height ── */}
      <div
        className="relative w-full bg-secondary/20 flex items-center justify-center overflow-hidden"
        style={{ height: '160px' }}
      >
        {b.logo_url ? (
          <>
            <img
              src={b.logo_url}
              alt={b.name}
              className="w-full h-full object-contain p-4 transition-transform duration-200 hover:scale-105"
            />
            {/* Clickable overlay with zoom hint */}
            <button
              onClick={() => onImageClick(b.logo_url!, b.name)}
              className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 hover:opacity-100 transition-opacity duration-200 bg-black/20"
              aria-label={`Ver imagen de ${b.name} en grande`}
            >
              <span className="text-[10px] font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded">
                Ver imagen
              </span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
            <Tag className="h-12 w-12" />
            <span className="text-[10px] font-mono uppercase tracking-wide">Sin imagen</span>
          </div>
        )}

        {/* Active/Inactive badge overlaid on image */}
        <div className="absolute top-2 right-2">
          <Badge
            variant={b.is_active ? 'default' : 'secondary'}
            className="text-[10px] px-1.5 py-0.5 shadow-sm"
          >
            {b.is_active ? 'Activa' : 'Inactiva'}
          </Badge>
        </div>
      </div>

      {/* ── Card body ── */}
      <CardContent className="pt-3 pb-4 flex flex-col gap-1 flex-1">
        <p className="font-semibold text-sm leading-tight">{b.name}</p>

        {b.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{b.description}</p>
        )}

        {count > 0 && (
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            {count} producto{count > 1 ? 's' : ''} activo{count > 1 ? 's' : ''}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border/50">
          <BrandForm brand={b} />
          <DeleteWithConfirm
            itemName={b.name}
            itemType="marca"
            productCount={count}
            onConfirm={() => deleteBrand(b.id)}
          />
          {!b.logo_url && (
            <div
              title="No hay imagen cargada para esta marca"
              className="ml-auto"
            >
              <ImageOff className="h-4 w-4 text-muted-foreground/40" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function BrandsListClient({
  brands,
  productCountByBrand,
}: BrandsListClientProps) {
  const [search, setSearch] = useState('')
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  const filteredBrands = brands.filter((b) => {
    const q = search.toLowerCase()
    return (
      b.name.toLowerCase().includes(q) ||
      (b.description || '').toLowerCase().includes(q)
    )
  })

  // Close lightbox on Escape key
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setLightbox(null)
  }

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown}>
      {/* Header + search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-display font-bold">
          Directorio de Marcas ({filteredBrands.length})
        </h2>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar marca..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredBrands.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center h-48 text-muted-foreground gap-3 border border-dashed rounded-xl">
            <Tag className="h-10 w-10 opacity-20" />
            <p>{search ? 'No se encontraron marcas' : 'No hay marcas registradas'}</p>
          </div>
        ) : (
          filteredBrands.map((b) => (
            <BrandCard
              key={b.id}
              b={b}
              count={productCountByBrand[b.id] || 0}
              onImageClick={(src, alt) => setLightbox({ src, alt })}
            />
          ))
        )}
      </div>

      {/* Lightbox portal */}
      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}
