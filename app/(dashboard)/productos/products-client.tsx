'use client'

import { useState, useMemo } from 'react'
import { ProductCard } from '@/components/shared/product-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { Plus, Search, RotateCcw, Package } from 'lucide-react'
import Link from 'next/link'
import type { ProductWithDetails } from '@/types/database'
import { cn } from '@/lib/utils'
import { ExportButton } from '@/components/shared/export-button'

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

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
type SortOption = 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc' | 'price_desc' | 'price_asc'

export function ProductsClient({ initialProducts, categories, brands, isAdmin }: ProductsClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('created_desc')

  const hasFilters = searchQuery || categoryFilter || brandFilter || stockFilter !== 'all'

  const filteredProducts = useMemo(() => {
    let result = [...initialProducts]

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

    // 4. Stock filter
    if (stockFilter !== 'all') {
      result = result.filter(p => {
        const totalStock = p.product_variants?.reduce((sum, v) => sum + v.stock_quantity, 0) ?? 0
        const reorderPoint = p.product_variants?.[0]?.stock_reorder_point ?? 0
        if (stockFilter === 'out_of_stock') return totalStock <= 0
        if (stockFilter === 'low_stock') return totalStock > 0 && totalStock <= reorderPoint
        if (stockFilter === 'in_stock') return totalStock > reorderPoint
        return true
      })
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
  }, [initialProducts, searchQuery, categoryFilter, brandFilter, stockFilter, sortBy])

  function handleResetFilters() {
    setSearchQuery('')
    setCategoryFilter('')
    setBrandFilter('')
    setStockFilter('all')
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
      <div className="bg-card border border-border rounded-none p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Search */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-1.5">
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

          {/* Category */}
          <div className="lg:col-span-2 space-y-1.5">
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

          {/* Brand */}
          <div className="lg:col-span-2 space-y-1.5">
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

          {/* Stock Status */}
          <div className="lg:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Stock</label>
            <select
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            >
              <option value="all">Todos</option>
              <option value="in_stock">Con stock</option>
              <option value="low_stock">Stock bajo</option>
              <option value="out_of_stock">Agotados</option>
            </select>
          </div>

          {/* Sort */}
          <div className="lg:col-span-2 space-y-1.5">
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

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-lg bg-card/50">
          <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground mb-4 font-mono text-sm">
            {hasFilters ? 'No hay productos con esos filtros' : 'No se encontraron productos'}
          </p>
          {hasFilters ? (
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Limpiar filtros
            </Button>
          ) : isAdmin ? (
            <Link href="/productos/nuevo" className={buttonVariants({ variant: 'outline' })}>
              Agregar primer producto
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
