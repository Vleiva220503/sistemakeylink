'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Pencil, Award, Layers } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { resolveProductImage } from '@/lib/resolve-product-image'
import Link from 'next/link'
import { AddStockModal } from '@/components/features/inventory/add-stock-modal'
import { SafeImage } from '@/components/shared/safe-image'

interface DetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: any
}

export function InventoryDetailSheet({ open, onOpenChange, data }: DetailSheetProps) {
  if (!data) return null

  const product = data.product || {}
  const productId = product.id || data.product_id

  // Prioridad de imagen: 1) imagen propia de variante, 2) imagen de producto, 3) logo de marca, 4) fallback del negocio
  const img = resolveProductImage(product, data.image_url)
  // Brand name — handle both "brands" (direct query) and "brand" (aliased query)
  const brandName = product.brands?.name || product.brand?.name || null


  const stockStatus = data.stock_quantity <= 0
    ? { label: 'Agotado', color: 'bg-destructive/15 text-destructive border-destructive/30' }
    : data.stock_quantity <= data.stock_reorder_point
    ? { label: 'Stock Bajo', color: 'bg-warning/15 text-warning border-warning/30' }
    : { label: 'Stock Normal', color: 'bg-success/15 text-success border-success/30' }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0 border-l border-border bg-card shadow-2xl">

        {/* Accent Top Bar */}
        <div className="h-1.5 w-full bg-primary" />

        <div className="p-6 space-y-6">
          <SheetHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                Ficha Técnica de Inventario
              </span>
              <Badge variant="outline" className={`text-xs font-mono font-bold ${stockStatus.color}`}>
                {stockStatus.label}
              </Badge>
            </div>
            <SheetTitle className="text-xl font-bold font-display tracking-tight text-foreground">
              {product.name || 'Calzado sin nombre'}
            </SheetTitle>
            <SheetDescription className="font-mono text-xs text-muted-foreground flex items-center gap-2">
              <span>SKU Variante: <strong className="text-foreground">{data.sku}</strong></span>
            </SheetDescription>
          </SheetHeader>

          {/* Card Hero AGRANDADA para la imagen/marca */}
          <div className="relative w-full h-60 border-2 border-border rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-sm group">
            <SafeImage
              src={img}
              alt={product.name || data.sku}
              className="object-contain w-full h-full p-4 transition-transform duration-300 group-hover:scale-105"
            />
            {data.color && (
              <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-md border border-border px-3 py-1 rounded-md text-xs font-mono font-bold text-primary shadow-md">
                Color: {data.color}
              </div>
            )}
            {data.size && (
              <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-md border border-border px-3 py-1 rounded-md text-xs font-mono font-bold text-foreground shadow-md">
                Talla: {data.size}
              </div>
            )}
          </div>

          {/* BOTONES DE ACCIÓN RÁPIDA */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {productId ? (
              <Link href={`/productos/${productId}/editar`} className="w-full">
                <Button variant="outline" className="w-full h-11 text-xs font-mono font-bold uppercase tracking-wider border-border hover:bg-muted gap-2">
                  <Pencil className="h-4 w-4 text-primary" />
                  Editar Producto
                </Button>
              </Link>
            ) : (
              <Button disabled variant="outline" className="w-full h-11 text-xs font-mono">
                No editable
              </Button>
            )}

            <div className="w-full">
              <AddStockModal
                variantId={data.id}
                productName={product.name || ''}
                sku={data.sku}
                currentStock={data.stock_quantity}
                color={data.color}
                size={data.size}
              />
            </div>
          </div>

          {/* Tarjetas Métricas Principales */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-background border border-border rounded-xl space-y-1 shadow-xs">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold">STOCK ACTUAL</span>
              <p className={`text-2xl font-black font-mono tracking-tight ${data.stock_quantity <= 0 ? 'text-destructive' : data.stock_quantity <= data.stock_reorder_point ? 'text-warning' : 'text-foreground'}`}>
                {data.stock_quantity} <span className="text-xs font-normal text-muted-foreground">unid.</span>
              </p>
            </div>

            <div className="p-3.5 bg-background border border-border rounded-xl space-y-1 shadow-xs">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold">COSTO UNITARIO</span>
              <p className="text-2xl font-black font-mono tracking-tight text-foreground">
                {formatCurrency(data.cost || 0)}
              </p>
            </div>
          </div>

          {/* Clasificación Categoría y Marca */}
          <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Clasificación del Calzado
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] font-mono">TALLA:</span>
                <span className="font-bold text-foreground">{product.categories?.name || 'General'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] font-mono">MARCA:</span>
                <span className="font-bold text-primary flex items-center gap-1">
                  <Award className="h-3.5 w-3.5" />
                  {brandName || 'Genérica'}
                </span>
              </div>
            </div>
          </div>

          {/* Especificaciones de la Variante */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">Parámetros de Reorden</h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-background border border-border rounded-lg flex justify-between items-center">
                <span className="text-muted-foreground">Stock Mínimo:</span>
                <span className="font-bold">{data.stock_min || 0}</span>
              </div>
              <div className="p-2.5 bg-background border border-border rounded-lg flex justify-between items-center">
                <span className="text-muted-foreground">Punto Reorden:</span>
                <span className="font-bold">{data.stock_reorder_point || 0}</span>
              </div>
            </div>
          </div>

          {/* Valoración Total en Almacén */}
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex justify-between items-center font-mono">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">CAPITAL EN INVENTARIO</span>
              <span className="text-xs text-primary/80">Stock × Costo</span>
            </div>
            <span className="font-black text-xl text-primary">
              {formatCurrency((data.stock_quantity || 0) * (data.cost || 0))}
            </span>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  )
}
