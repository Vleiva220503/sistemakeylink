import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, getStockStatus } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Edit, Image as ImageIcon, Box, Flame, Shield, Layers, Zap } from 'lucide-react'
import Link from 'next/link'
import type { ProductWithDetails } from '@/types/database'
import { DeleteProductButton } from './delete-product-button'
import { SafeImage } from '@/components/shared/safe-image'
import { resolveProductImage } from '@/lib/resolve-product-image'

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories(id, name, description),
      brands(id, name, logo_url),
      product_images(*),
      product_variants(*)
    `)
    .eq('id', resolvedParams.id)
    .single()

  if (error || !data) {
    notFound()
  }

  // Check if current user is admin (to show/hide cost column)
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const isAdmin = (profile as any)?.role === 'admin'

  const product = data as unknown as ProductWithDetails
  const imageUrl = resolveProductImage(product as any)
  
  const totalStock = product.product_variants?.reduce((sum, v) => sum + v.stock_quantity, 0) || 0
  const reorderPoint = product.product_variants?.[0]?.stock_reorder_point || 0
  const stockStatus = getStockStatus(totalStock, reorderPoint)

  const sizes = Array.from(
    new Set(
      product.product_variants
        ?.map(v => v.size)
        .filter((s): s is string => Boolean(s))
    )
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <Link href="/productos" className={buttonVariants({ variant: "outline", size: "icon" })}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-primary font-bold uppercase tracking-widest">
              <span>{product.brands?.name || 'SNEAKER VAULT'}</span>
              <span>•</span>
              <span>REF: {product.sku}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-black uppercase tracking-tight text-foreground">
              {product.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link href={`/productos/${product.id}/editar`} className={buttonVariants({ variant: "default" })} style={{ color: 'hsl(var(--primary-foreground))' }}>
              <Edit className="h-4 w-4 mr-2" />
              EDITAR
            </Link>
          )}
          <DeleteProductButton
            productId={product.id}
            productName={product.name}
            totalStock={totalStock}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sneaker Image Showcase (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="sneaker-hero-bg border-border relative overflow-hidden p-6 flex flex-col items-center justify-center">
            {/* Watermark SKU */}
            <div className="absolute top-2 left-2 text-6xl font-display font-black text-white/[0.04] pointer-events-none select-none uppercase">
              {product.sku}
            </div>

            <div className="relative aspect-square w-full flex items-center justify-center">
              <SafeImage 
                src={imageUrl} 
                alt={product.name} 
                className="object-contain w-full h-full drop-shadow-[0_20px_35px_rgba(255,62,0,0.25)] transition-transform duration-500 hover:scale-105 hover:-rotate-2"
              />
            </div>

            {product.product_images && product.product_images.length > 1 && (
              <div className="flex gap-2 pt-4 overflow-x-auto w-full justify-center">
                {product.product_images.map(img => (
                  <div key={img.id} className={`w-14 h-14 border-2 shrink-0 ${img.is_primary ? 'border-primary' : 'border-border/60'}`}>
                    <SafeImage src={img.url} alt="" className="object-cover w-full h-full" />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Pricing & Drop Status Card */}
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="font-display text-lg font-bold uppercase">VALORIZACIÓN & DROPS</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center p-2.5 bg-secondary/30 border border-border">
                <span className="text-muted-foreground uppercase">PRECIO BASE</span>
                <span className="font-display font-black text-2xl text-primary">{formatCurrency(product.base_price)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-secondary/30 border border-border">
                <span className="text-muted-foreground uppercase">TALLA</span>
                <span className="font-bold text-foreground text-sm uppercase">
                  {product.categories?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-secondary/30 border border-border">
                <span className="text-muted-foreground uppercase">DESC. TALLA</span>
                <span className="font-bold text-foreground text-sm uppercase">
                  {product.categories?.description || '—'}
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-secondary/30 border border-border">
                <span className="text-muted-foreground uppercase">DISPONIBILIDAD TOTAL</span>
                <span className="font-bold text-foreground text-sm">{totalStock} PARES EN INVENTARIO</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sneaker Details & Sizes (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Description */}
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="font-display text-lg font-bold uppercase">DETALLES DEL MODELO</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="whitespace-pre-line text-sm text-muted-foreground font-sans leading-relaxed">
                {product.description || 'Sin descripción detallada para este calzado.'}
              </p>
            </CardContent>
          </Card>

          {/* Size Pill Selector Showcase */}
          {sizes.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="font-display text-lg font-bold uppercase flex items-center justify-between">
                  <span>TALLAS DISPONIBLES</span>
                  <span className="text-xs font-mono font-bold text-primary">{sizes.length} TALLAS</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {sizes.map(size => (
                    <div key={size} className="size-btn px-4 py-2 font-mono text-sm font-bold active">
                      US {size}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Variants Table */}
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg font-bold uppercase flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                VARIANTES EN INVENTARIO
              </CardTitle>
              <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 border border-primary/30">
                {product.product_variants?.length || 0} VARIANTES
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {product.product_variants && product.product_variants.length > 0 ? (
                <table className="w-full text-xs font-mono text-left">
                  <thead className="bg-secondary/40 text-muted-foreground uppercase border-b border-border font-display font-bold">
                    <tr>
                      <th className="px-4 py-3">SKU & TALLA</th>
                      {isAdmin && <th className="px-4 py-3 text-right">COSTO</th>}
                      <th className="px-4 py-3 text-right">PRECIO</th>
                      <th className="px-4 py-3 text-right">STOCK</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {product.product_variants.map(variant => (
                      <tr key={variant.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground">{variant.sku}</div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {variant.size && <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">US {variant.size}</span>}
                            {variant.color && <span className="border border-white/20 px-1.5 py-0.5 rounded">{variant.color}</span>}
                            {variant.quality && <span className="border border-white/20 px-1.5 py-0.5 rounded">{variant.quality}</span>}
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(variant.cost)}</td>
                        )}
                        <td className="px-4 py-3 text-right font-bold text-primary">{variant.price_override ? formatCurrency(variant.price_override) : '-'}</td>
                        <td className="px-4 py-3 text-right font-bold text-sm">
                          <span className={variant.stock_quantity <= variant.stock_reorder_point ? 'text-warning' : 'text-foreground'}>
                            {variant.stock_quantity} PARES
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-muted-foreground font-mono text-xs">
                  NO HAY VARIANTES CONFIGURADAS
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
