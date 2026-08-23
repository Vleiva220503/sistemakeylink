'use client'

import { useState, useMemo } from 'react'
import { Package, AlertTriangle, TrendingDown, Eye, Plus, Search, Filter, RotateCcw, ArrowUpDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, cn } from '@/lib/utils'
import { AddStockModal } from '@/components/features/inventory/add-stock-modal'
import { InventoryDetailSheet } from '@/components/features/inventory/inventory-detail-sheet'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SafeImage } from '@/components/shared/safe-image'
import { ExportButton } from '@/components/shared/export-button'
import { resolveProductImage } from '@/lib/resolve-product-image'

interface InventoryClientProps {
  initialVariants: any[]
  isAdmin?: boolean
}

export function InventoryClient({ initialVariants, isAdmin = false }: InventoryClientProps) {
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null)

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'out' | 'low' | 'normal'>('all')
  const [sortBy, setSortBy] = useState<string>('name-asc')

  const variants = initialVariants || []

  // Dynamic filter options based on data
  const categories = useMemo(() => {
    const map = new Map()
    variants.forEach((v: any) => {
      const cat = v.product?.categories
      if (cat?.id && cat?.name) {
        map.set(cat.id, { name: cat.name, description: cat.description })
      }
    })
    return Array.from(map.entries()).map(([id, val]: any) => ({
      id,
      name: val.name,
      description: val.description,
    }))
  }, [variants])

  const brands = useMemo(() => {
    const map = new Map()
    variants.forEach((v: any) => {
      const br = v.product?.brands
      if (br?.id && br?.name) {
        map.set(br.id, br.name)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [variants])

  // Filter & Sort Logic
  const filteredVariants = useMemo(() => {
    let result = [...variants]

    // 1. Text Search (Name, SKU, Barcode)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((v: any) =>
        v.product?.name?.toLowerCase().includes(q) ||
        v.sku?.toLowerCase().includes(q) ||
        v.product?.sku?.toLowerCase().includes(q) ||
        v.product?.barcode?.toLowerCase().includes(q) ||
        v.size?.toLowerCase().includes(q) ||
        v.color?.toLowerCase().includes(q)
      )
    }

    // 2. Category Filter
    if (categoryFilter) {
      result = result.filter((v: any) => v.product?.category_id === categoryFilter)
    }

    // 3. Brand Filter
    if (brandFilter) {
      result = result.filter((v: any) => v.product?.brand_id === brandFilter)
    }

    // 4. Stock Range Filter
    if (stockFilter !== 'all') {
      result = result.filter((v: any) => {
        if (stockFilter === 'out') return v.stock_quantity <= 0
        if (stockFilter === 'low') return v.stock_quantity > 0 && v.stock_quantity <= v.stock_reorder_point
        if (stockFilter === 'normal') return v.stock_quantity > v.stock_reorder_point
        return true
      })
    }

    // 5. Sorting
    result.sort((a: any, b: any) => {
      if (sortBy === 'name-asc') {
        return (a.product?.name || '').localeCompare(b.product?.name || '')
      }
      if (sortBy === 'name-desc') {
        return (b.product?.name || '').localeCompare(a.product?.name || '')
      }
      if (sortBy === 'stock-desc') {
        return b.stock_quantity - a.stock_quantity
      }
      if (sortBy === 'stock-asc') {
        return a.stock_quantity - b.stock_quantity
      }
      if (sortBy === 'price-desc') {
        const aPrice = a.price_override ?? a.product?.base_price ?? 0
        const bPrice = b.price_override ?? b.product?.base_price ?? 0
        return bPrice - aPrice
      }
      if (sortBy === 'price-asc') {
        const aPrice = a.price_override ?? a.product?.base_price ?? 0
        const bPrice = b.price_override ?? b.product?.base_price ?? 0
        return aPrice - bPrice
      }
      return 0
    })

    return result
  }, [variants, searchQuery, categoryFilter, brandFilter, stockFilter, sortBy])

  // Stats on filtered inventory
  const outOfStock = filteredVariants.filter((v: any) => v.stock_quantity <= 0)
  const lowStock = filteredVariants.filter((v: any) => v.stock_quantity > 0 && v.stock_quantity <= v.stock_reorder_point)
  const totalValue = filteredVariants.reduce((sum: number, v: any) => sum + (v.stock_quantity * v.cost), 0)

  function getStockStatus(v: any) {
    if (v.stock_quantity <= 0) return { label: 'Agotado', variant: 'destructive' as const }
    if (v.stock_quantity <= v.stock_reorder_point) return { label: 'Stock Bajo', variant: 'warning' as const }
    return { label: 'Normal', variant: 'default' as const }
  }

  function handleResetFilters() {
    setSearchQuery('')
    setCategoryFilter('')
    setBrandFilter('')
    setStockFilter('all')
    setSortBy('name-asc')
  }

  const handleExportExcel = async () => {
    const { exportToExcel } = await import('@/lib/export-utils')
    const rows = filteredVariants.map((v: any) => {
      const row: any = {
        Nombre: v.product?.name || '',
        SKU: v.sku || '',
        Talla: v.size || '—',
        Color: v.color || '—',
        Marca: v.product?.brands?.name || '—',
        Stock: v.stock_quantity || 0,
      }
      if (isAdmin) {
        row.Costo = v.cost || 0
        row.Precio = v.price_override ?? v.product?.base_price ?? 0
      }
      row.Estado = v.stock_quantity <= 0 ? 'Agotado' : v.stock_quantity <= v.stock_reorder_point ? 'Stock Bajo' : 'Normal'
      return row
    })
    await exportToExcel(rows, `Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Inventario')
  }

  const handleExportPDF = async () => {
    const { exportInventoryPDF } = await import('@/lib/export-utils')
    const rows = filteredVariants.map((v: any) => ({
      nombre: v.product?.name || '',
      sku: v.sku || '',
      talla: v.size || '—',
      color: v.color || '—',
      categoria: v.product?.categories?.name || '—',
      marca: v.product?.brands?.name || '—',
      stock: v.stock_quantity || 0,
      costo: v.cost || 0,
      precio: v.price_override ?? v.product?.base_price ?? 0,
      estado: v.stock_quantity <= 0 ? 'Agotado' : v.stock_quantity <= v.stock_reorder_point ? 'Stock Bajo' : 'Normal',
    }))
    await exportInventoryPDF(rows, isAdmin)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Inventario</h1>
          <p className="text-muted-foreground">Estado del stock, alertas e ingreso de mercancía por variante</p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
          <Link href="/productos/nuevo" className={buttonVariants({ variant: "default" })} style={{ color: 'hsl(var(--primary-foreground))' }}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className={cn("grid gap-4", isAdmin ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3")}>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{filteredVariants.length}</p>
                <p className="text-xs text-muted-foreground">Variantes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold text-destructive">{outOfStock.length}</p>
                <p className="text-xs text-muted-foreground">Agotados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xl font-bold text-warning">{lowStock.length}</p>
                <p className="text-xs text-muted-foreground">Stock Bajo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {isAdmin && (
          <Card>
            <CardContent className="pt-5">
              <div>
                <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
                <p className="text-xs text-muted-foreground">Valor en Inventario</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Alerts */}
      {outOfStock.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 mb-3 text-destructive font-semibold">
            <AlertTriangle className="h-4 w-4" />
            {outOfStock.length} producto(s) agotado(s)
          </div>
          <div className="flex flex-wrap gap-2">
            {outOfStock.map((v: any) => (
              <Badge key={v.id} variant="destructive">{v.product?.name} — {v.sku}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Búsqueda y Filtros */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Buscador */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, SKU, barra..."
                  className="pl-9 h-10 text-sm bg-background border-border"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Categorías */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Talla</label>
              <select
                className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Todas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.description ? ` — ${c.description}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Marcas */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Marca</label>
              <select
                className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
              >
                <option value="">Todas</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Alertas de Stock */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Stock</label>
              <select
                className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
              >
                <option value="all">Todos</option>
                <option value="normal">Normal</option>
                <option value="low">Stock Bajo</option>
                <option value="out">Agotados</option>
              </select>
            </div>

            {/* Ordenar */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Ordenar</label>
              <select
                className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name-asc">Nombre (A-Z)</option>
                <option value="name-desc">Nombre (Z-A)</option>
                <option value="stock-desc">Stock (Mayor a menor)</option>
                <option value="stock-asc">Stock (Menor a mayor)</option>
                <option value="price-desc">Precio Drops (Mayor a menor)</option>
                <option value="price-asc">Precio Drops (Menor a mayor)</option>
              </select>
            </div>
          </div>

          {/* Botón reset */}
          {(searchQuery || categoryFilter || brandFilter || stockFilter !== 'all') && (
            <div className="flex justify-end pt-2">
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
        </CardContent>
      </Card>

      {/* Full table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock por Variante / Calzado</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View (< 768px) */}
          <div className="block md:hidden space-y-3">
            {filteredVariants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground font-mono text-xs bg-background/50 border border-border p-4">
                No hay productos que coincidan con los filtros.
              </div>
            ) : (
              filteredVariants.map((v: any) => {
                const img = resolveProductImage(v.product, v.image_url)
                const isOutOfStock = v.stock_quantity <= 0
                const isLowStock = v.stock_quantity <= v.stock_reorder_point && v.stock_quantity > 0

                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className="bg-background border border-border p-3.5 space-y-3 text-xs shadow-sm cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 border-b border-border/50 pb-2.5">
                      <div className="h-12 w-12 border border-border bg-muted/40 rounded flex items-center justify-center overflow-hidden shrink-0">
                        <SafeImage src={img} alt={v.sku} className="object-contain w-full h-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm truncate">{v.product?.name}</p>
                        <p className="font-mono text-muted-foreground text-[11px]">SKU: {v.sku}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase shrink-0 ${
                          isOutOfStock
                            ? 'bg-destructive/20 text-destructive'
                            : isLowStock
                            ? 'bg-warning/20 text-warning'
                            : 'bg-success/20 text-success'
                        }`}
                      >
                        {isOutOfStock ? 'Agotado' : isLowStock ? 'Bajo' : 'Normal'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-muted-foreground font-mono text-[11px]">
                      <div>
                        <span className="text-foreground font-semibold">Talla:</span> {v.product?.categories?.name || '—'}
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Stock:</span> <span className="font-bold text-foreground">{v.stock_quantity} uds</span>
                      </div>
                      {isAdmin && (
                        <div>
                          <span className="text-foreground font-semibold">Costo:</span> {formatCurrency(v.cost)}
                        </div>
                      )}
                      {isAdmin && (
                        <div>
                          <span className="text-foreground font-semibold">Valor Stock:</span> {formatCurrency(v.stock_quantity * v.cost)}
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="pt-2 border-t border-border/50 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[11px] font-mono text-muted-foreground">Acciones:</span>
                        <AddStockModal
                          variantId={v.id}
                          productName={v.product?.name || ''}
                          sku={v.sku}
                          currentStock={v.stock_quantity}
                          color={v.color}
                          size={v.size}
                        />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Desktop/Tablet Table View (>= 768px) */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 whitespace-nowrap">Imagen</TableHead>
                  <TableHead className="whitespace-nowrap">Producto</TableHead>
                  <TableHead className="whitespace-nowrap">SKU</TableHead>
                  <TableHead className="whitespace-nowrap">Talla</TableHead>
                  <TableHead className="whitespace-nowrap">Desc. Talla</TableHead>
                  <TableHead className="whitespace-nowrap">Detalles</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Stock</TableHead>
                  {isAdmin && <TableHead className="text-right whitespace-nowrap">Costo</TableHead>}
                  {isAdmin && <TableHead className="text-right whitespace-nowrap">Valor Stock</TableHead>}
                  {isAdmin && <TableHead className="text-center whitespace-nowrap">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVariants.map((v: any) => {
                  const img = resolveProductImage(v.product, v.image_url)

                  return (
                    <TableRow
                      key={v.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        v.stock_quantity <= 0 ? 'bg-destructive/5' : v.stock_quantity <= v.stock_reorder_point ? 'bg-warning/5' : ''
                      }`}
                    >
                      <TableCell onClick={() => setSelectedVariant(v)} className="whitespace-nowrap">
                        <div className="h-10 w-10 border border-border bg-muted/40 rounded flex items-center justify-center overflow-hidden">
                          <SafeImage src={img} alt={v.sku} className="object-contain w-full h-full" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap" onClick={() => setSelectedVariant(v)}>
                        {v.product?.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap" onClick={() => setSelectedVariant(v)}>
                        {v.sku}
                      </TableCell>
                      <TableCell onClick={() => setSelectedVariant(v)} className="whitespace-nowrap">
                        <span className="font-bold text-foreground">
                          {v.product?.categories?.name || '—'}
                        </span>
                      </TableCell>
                      <TableCell onClick={() => setSelectedVariant(v)} className="whitespace-nowrap">
                        <span className="text-muted-foreground font-mono text-xs">
                          {v.product?.categories?.description || '—'}
                        </span>
                      </TableCell>
                      <TableCell onClick={() => setSelectedVariant(v)} className="whitespace-nowrap">
                        <div className="flex gap-1 flex-nowrap">
                          {v.product?.categories?.name && (
                            <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5 whitespace-nowrap">
                              Talla: {v.product.categories.name}
                            </Badge>
                          )}
                          {v.color && (
                            <Badge variant="outline" className="text-xs bg-secondary/35 text-foreground border-border whitespace-nowrap">
                              {v.color}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Stock Clicable */}
                      <TableCell className="text-center font-bold whitespace-nowrap" onClick={() => setSelectedVariant(v)}>
                        <span className={`px-2 py-1 rounded ${
                          v.stock_quantity <= 0 ? 'bg-destructive/20 text-destructive font-black' : v.stock_quantity <= v.stock_reorder_point ? 'bg-warning/20 text-warning font-black' : 'text-foreground'
                        }`}>
                          {v.stock_quantity}
                        </span>
                      </TableCell>

                      {isAdmin && (
                        <TableCell className="text-right whitespace-nowrap" onClick={() => setSelectedVariant(v)}>
                          {formatCurrency(v.cost)}
                        </TableCell>
                      )}
                      {isAdmin && (
                        <TableCell className="text-right font-bold whitespace-nowrap" onClick={() => setSelectedVariant(v)}>
                          {formatCurrency(v.stock_quantity * v.cost)}
                        </TableCell>
                      )}

                      {/* Botón de Agregar Cantidad al Stock */}
                      {isAdmin && (
                        <TableCell className="text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <AddStockModal
                              variantId={v.id}
                              productName={v.product?.name || ''}
                              sku={v.sku}
                              currentStock={v.stock_quantity}
                              color={v.color}
                              size={v.size}
                            />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Side Panel Sheet */}
      <InventoryDetailSheet
        open={!!selectedVariant}
        onOpenChange={(open) => !open && setSelectedVariant(null)}
        data={selectedVariant}
      />
    </div>
  )
}
