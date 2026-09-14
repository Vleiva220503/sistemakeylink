'use client'

import { useState, useMemo, useTransition } from 'react'
import { ProductCard } from '@/components/shared/product-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { Plus, Search, RotateCcw, Package, RefreshCw, Loader2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import type { ProductWithDetails } from '@/types/database'
import { cn } from '@/lib/utils'
import { ExportButton } from '@/components/shared/export-button'
import { reactivateProduct } from '@/app/actions/products'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { resolveProductImage } from '@/lib/resolve-product-image'
import { SafeImage } from '@/components/shared/safe-image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

interface ProductsClientProps {
  initialProducts: ProductWithDetails[]
  categories: Category[]
  brands: Brand[]
  isAdmin: boolean
}

type ViewFilter = 'all' | 'active' | 'discontinued' | 'in_stock' | 'low_stock' | 'out_of_stock'
type SortOption = 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc' | 'price_desc' | 'price_asc'

// ─── Discontinued Product Card ─────────────────────────────────────────────────
function DiscontinuedCard({ product, isAdmin }: { product: ProductWithDetails; isAdmin: boolean }) {
  const [isPending, startTransition] = useTransition()
  const imageUrl = resolveProductImage(product as any)

  function handleReactivate() {
    startTransition(async () => {
      const result = await reactivateProduct(product.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Producto reactivado correctamente')
      }
    })
  }

  return (
    <Card className="sneaker-card h-full overflow-hidden border-border bg-card/90 flex flex-col justify-between rounded-none relative opacity-70">
      {/* Discontinued banner */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-secondary/90 flex items-center justify-center gap-1 py-0.5">
        <Badge variant="secondary" className="text-[10px]">Descontinuado</Badge>
      </div>

      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-b from-secondary/40 to-background flex items-center justify-center p-4 pt-7">
        <SafeImage
          src={imageUrl}
          alt={product.name}
          className="object-contain w-full h-full"
        />
      </div>

      {/* Body */}
      <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-widest font-semibold text-primary">
              Talla: {(product as any).categories?.name || '—'}
            </span>
            <span className="text-[10px] opacity-70 font-mono">REF: {product.sku}</span>
          </div>
          <h3 className="font-display text-base font-bold tracking-tight text-foreground line-clamp-2 uppercase leading-tight">
            {product.name}
          </h3>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/60">
          <span className="font-display font-black text-lg text-muted-foreground">
            {formatCurrency(product.base_price)}
          </span>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              disabled={isPending}
              onClick={handleReactivate}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Reactivar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function ProductsClient({ initialProducts, categories, brands, isAdmin }: ProductsClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [viewFilter, setViewFilter] = useState<ViewFilter>('active')
  const [sortBy, setSortBy] = useState<SortOption>('created_desc')

  const hasFilters = searchQuery || categoryFilter || brandFilter || viewFilter !== 'active'

  const discontinuedCount = useMemo(
    () => initialProducts.filter((p) => p.status === 'discontinued').length,
    [initialProducts]
  )

  const filteredProducts = useMemo(() => {
    let result = [...initialProducts]

    // 0. Unified View Filter
    if (viewFilter === 'active') {
      result = result.filter(p => p.status !== 'discontinued')
    } else if (viewFilter === 'discontinued') {
      result = result.filter(p => p.status === 'discontinued')
    } else if (['in_stock', 'low_stock', 'out_of_stock'].includes(viewFilter)) {
      // Stock filters imply we only look at active products
      result = result.filter(p => {
        if (p.status === 'discontinued') return false
        const totalStock = p.product_variants?.reduce((sum, v) => sum + v.stock_quantity, 0) ?? 0
        const reorderPoint = p.product_variants?.[0]?.stock_reorder_point ?? 0
        if (viewFilter === 'out_of_stock') return totalStock <= 0
        if (viewFilter === 'low_stock') return totalStock > 0 && totalStock <= reorderPoint
        if (viewFilter === 'in_stock') return totalStock > reorderPoint
        return true
      })
    }
    // 'all' => no filter applied

    // 1. Text search (name, sku, barcode)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        (p as any).barcode?.toLowerCase().includes(q) ||
        (p.brands as any)?.name?.toLowerCase().includes(q) ||
        (p.categories as any)?.name?.toLowerCase().includes(q)
      )
    }

    // 2. Category filter
    if (categoryFilter) {
      result = result.filter(p => p.category_id === categoryFilter)
    }

    // 3. Brand filter
    if (brandFilter) {
      result = result.filter(p => p.brand_id === brandFilter)
    }

    // 5. Sort
    result.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name)
      if (sortBy === 'price_asc') return a.base_price - b.base_price
      if (sortBy === 'price_desc') return b.base_price - a.base_price
      if (sortBy === 'created_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      // Default: created_desc
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return result
  }, [initialProducts, searchQuery, categoryFilter, brandFilter, viewFilter, sortBy])

  function handleResetFilters() {
    setSearchQuery('')
    setCategoryFilter('')
    setBrandFilter('')
    setViewFilter('active')
    setSortBy('created_desc')
  }

  const handleExportExcel = async () => {
    const { exportToExcel } = await import('@/lib/export-utils')
    const rows = filteredProducts.map((p) => {
      const totalStock = p.product_variants?.reduce((sum, v) => sum + v.stock_quantity, 0) ?? 0
      const cost = p.product_variants?.[0]?.cost ?? 0
      const price = p.base_price
      const row: any = {
        Nombre: p.name || '',
        SKU: p.sku || '',
        Talla: (p.categories as any)?.name || '—',
        Marca: (p.brands as any)?.name || '—',
        Stock: totalStock,
      }
      if (isAdmin) {
        row.Costo = cost
        row.Precio = price
      }
      row.Estado = p.status === 'active' ? 'Activo' : p.status === 'inactive' ? 'Inactivo' : 'Descontinuado'
      return row
    })
    await exportToExcel(rows, `Productos_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Productos')
  }

  const handleExportPDF = async () => {
    const { exportInventoryPDF } = await import('@/lib/export-utils')
    const rows = filteredProducts.map((p) => {
      const totalStock = p.product_variants?.reduce((sum, v) => sum + v.stock_quantity, 0) ?? 0
      const cost = p.product_variants?.[0]?.cost ?? 0
      const price = p.base_price
      return {
        nombre: p.name || '',
        sku: p.sku || '',
        talla: '—',
        color: '—',
        categoria: (p.categories as any)?.name || '—',
        marca: (p.brands as any)?.name || '—',
        stock: totalStock,
        costo: cost,
        precio: price,
        estado: p.status === 'active' ? 'Activo' : 'Inactivo',
      }
    })
    await exportInventoryPDF(rows, isAdmin)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Catálogo</h1>
          <p className="text-muted-foreground">
            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
            {hasFilters ? ` (filtrado de ${initialProducts.length})` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
          {isAdmin && (
            <Link href="/productos/nuevo" className={cn(buttonVariants(), 'shrink-0')} style={{ color: 'hsl(var(--primary-foreground))' }}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Link>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">

        {/* Row 1 — primary filters */}
        {/* Mobile: 1 col | Tablet (sm): 2 col | Desktop (md+): 12 col */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">

          {/* Buscar — full width on mobile & tablet, 4 cols on desktop */}
          <div className="sm:col-span-2 md:col-span-4 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nombre, SKU, marca..."
                className="pl-9 h-10 text-sm bg-background border-border focus-visible:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Filtro Unificado (Estado/Stock) */}
          <div className="sm:col-span-1 md:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Mostrar</label>
            <select
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              value={viewFilter}
              onChange={(e) => setViewFilter(e.target.value as ViewFilter)}
            >
              <option value="all">Todos los productos</option>
              <optgroup label="Por Estado">
                <option value="active">Solo activos</option>
                <option value="discontinued">Solo inactivos{discontinuedCount > 0 ? ` (${discontinuedCount})` : ''}</option>
              </optgroup>
              <optgroup label="Por Nivel de Stock (Activos)">
                <option value="in_stock">Con stock normal</option>
                <option value="low_stock">Stock bajo</option>
                <option value="out_of_stock">Stock 0 (Agotados)</option>
              </optgroup>
            </select>
          </div>

          {/* Talla — half on tablet, 2 cols on desktop */}
          <div className="sm:col-span-1 md:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Talla</label>
            <select
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Todas</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Marca — half on tablet, 2 cols on desktop */}
          <div className="sm:col-span-1 md:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Marca</label>
            <select
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
            >
              <option value="">Todas</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Ordenar — half on tablet, 2 cols on desktop */}
          <div className="sm:col-span-1 md:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Ordenar</label>
            <select
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="created_desc">Más recientes</option>
              <option value="created_asc">Más antiguos</option>
              <option value="name_asc">Nombre (A-Z)</option>
              <option value="name_desc">Nombre (Z-A)</option>
              <option value="price_desc">Precio (Mayor a menor)</option>
              <option value="price_asc">Precio (Menor a mayor)</option>
            </select>
          </div>
        </div>

        {/* Row 2 no longer needed since we unified the filters into Row 1 */}

        {hasFilters && (
          <div className="flex justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground gap-1.5"
              onClick={handleResetFilters}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>

      {viewFilter === 'discontinued' && filteredProducts.length > 0 && isAdmin && (
        <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 text-warning text-sm rounded-none">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p className="text-xs">
            Estás viendo productos descontinuados. Haz clic en <strong>Reactivar</strong> en cualquier card para volver a incluirlo en el catálogo activo.
          </p>
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-lg bg-card/50">
          <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground mb-4 font-mono text-sm">
            {viewFilter === 'discontinued'
              ? 'No hay productos descontinuados'
              : hasFilters
              ? 'No hay productos con esos filtros'
              : 'No se encontraron productos'}
          </p>
          {hasFilters ? (
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Limpiar filtros
            </Button>
          ) : viewFilter === 'active' && isAdmin ? (
            <Link href="/productos/nuevo" className={buttonVariants({ variant: 'outline' })}>
              Agregar primer producto
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredProducts.map((product) =>
            product.status === 'discontinued' ? (
              <DiscontinuedCard key={product.id} product={product} isAdmin={isAdmin} />
            ) : (
              <ProductCard key={product.id} product={product} />
            )
          )}
        </div>
      )}
    </div>
  )
}
