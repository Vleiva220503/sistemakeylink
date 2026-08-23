import Link from 'next/link'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, getStockStatus } from '@/lib/utils'
import { resolveProductImage } from '@/lib/resolve-product-image'
import type { ProductWithDetails } from '@/types/database'
import { Flame, ArrowUpRight, Zap } from 'lucide-react'
import { SafeImage } from '@/components/shared/safe-image'

interface ProductCardProps {
  product: ProductWithDetails
}

export function ProductCard({ product }: ProductCardProps) {
  const totalStock = product.product_variants?.reduce((sum, v) => sum + v.stock_quantity, 0) || 0
  const reorderPoint = product.product_variants?.[0]?.stock_reorder_point || 0
  const stockStatus = getStockStatus(totalStock, reorderPoint)
  const imageUrl = resolveProductImage(product as any)
  
  // Extract unique sizes available for this sneaker
  const sizes = Array.from(
    new Set(
      product.product_variants
        ?.map(v => v.size)
        .filter((s): s is string => Boolean(s))
    )
  ).slice(0, 5)

  return (
    <Link href={`/productos/${product.id}`} className="group block h-full">
      <Card className="sneaker-card h-full overflow-hidden border-border bg-card/90 flex flex-col justify-between rounded-none relative">
        {/* Giant Model SKU Watermark Text behind image */}
        <div className="absolute top-2 left-2 text-5xl font-display font-black text-white/[0.04] pointer-events-none select-none tracking-tighter uppercase leading-none">
          {product.sku}
        </div>

        {/* Sneaker Image Container with Floating Zoom Effect */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-b from-secondary/40 to-background flex items-center justify-center p-4">
          <SafeImage 
            src={imageUrl} 
            alt={product.name}
            className="floating-sneaker-img object-contain w-full h-full drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)]"
          />

          {/* Top Sneaker Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1 items-end z-10">
            {totalStock > 0 && totalStock <= reorderPoint && (
              <span className="bg-primary text-primary-foreground font-display font-extrabold text-[10px] tracking-widest uppercase px-2 py-0.5 shadow-md shadow-primary/30 flex items-center gap-1">
                <Zap className="h-3 w-3 fill-current" /> FEW PAIRS LEFT
              </span>
            )}
            {totalStock <= 0 && (
              <span className="bg-destructive text-destructive-foreground font-display font-extrabold text-[10px] tracking-widest uppercase px-2 py-0.5">
                SOLD OUT
              </span>
            )}
          </div>

          {/* Brand Tag Overlay */}
          {product.brand_id && product.brands && (
            <div className="absolute bottom-3 left-3 z-10">
              <span className="text-[11px] font-display font-extrabold tracking-widest uppercase px-2.5 py-1 bg-black/80 text-foreground border border-white/20 backdrop-blur-md">
                {product.brands.name}
              </span>
            </div>
          )}
        </div>
        
        {/* Card Body */}
        <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex flex-col gap-1 text-[11px] font-mono text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-widest font-semibold text-primary">
                  Talla: {product.categories?.name || '—'}
                </span>
                <span className="text-[10px] opacity-70">REF: {product.sku}</span>
              </div>
              {product.categories?.description && (
                <span className="text-[10px] text-muted-foreground truncate uppercase">
                  Desc. Talla: {product.categories.description}
                </span>
              )}
            </div>

            <h3 className="font-display text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2 uppercase leading-tight">
              {product.name}
            </h3>
          </div>

          {/* Sneaker Size Grid Selector */}
          {sizes.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] font-display font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">
                TALLAS DISPONIBLES
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {sizes.map(size => (
                  <span 
                    key={size} 
                    className="size-btn px-2 py-0.5 text-xs rounded-none font-mono"
                  >
                    US {size}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        
        {/* Card Footer */}
        <CardFooter className="px-4 pb-4 pt-3 flex items-center justify-between border-t border-border/60 bg-secondary/20">
          <div>
            <span className="text-[10px] font-display font-bold text-muted-foreground uppercase tracking-widest block">PRECIO DROPS</span>
            <span className="font-display font-black text-2xl text-foreground group-hover:text-primary transition-colors">
              {formatCurrency(product.base_price)}
            </span>
          </div>

          <div className="h-10 w-10 bg-primary text-primary-foreground flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-primary/20">
            <ArrowUpRight className="h-5 w-5 stroke-[2.5]" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
