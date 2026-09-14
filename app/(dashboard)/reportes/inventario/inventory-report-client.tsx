'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Package, AlertTriangle, DollarSign, TrendingUp, Search, RotateCcw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ExportButton } from '@/components/shared/export-button'

interface Category {
  id: string
  name: string
  description?: string | null
}

interface Brand {
  id: string
  name: string
}

interface InventoryReportClientProps {
  initialVariants: any[]
  categories: Category[]
  brands: Brand[]
  isAdmin: boolean
}

type StockStatusFilter = 'all' | 'out_of_stock' | 'low_stock' | 'normal'

export function InventoryReportClient({
  initialVariants,
  categories,
  brands,
  isAdmin,
}: InventoryReportClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [stockFilter, setStockFilter] = useState<StockStatusFilter>('all')

  const hasFilters = searchQuery || categoryFilter || brandFilter || stockFilter !== 'all'

  const filteredVariants = useMemo(() => {
    let result = [...initialVariants]

    // 1. Text Search (name, sku)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(v =>
        v.product?.name?.toLowerCase().includes(q) ||
        v.sku?.toLowerCase().includes(q)
      )
    }

    // 2. Category Filter
    if (categoryFilter) {
      result = result.filter(v => v.product?.category_id === categoryFilter)
    }

    // 3. Brand Filter
    if (brandFilter) {
      result = result.filter(v => v.product?.brand_id === brandFilter)
    }

    // 4. Stock Status Filter
    if (stockFilter !== 'all') {
      result = result.filter(v => {
        const isOutOfStock = v.stock_quantity <= 0
        const isLowStock = v.stock_quantity <= v.stock_reorder_point && v.stock_quantity > 0
        if (stockFilter === 'out_of_stock') return isOutOfStock
        if (stockFilter === 'low_stock') return isLowStock
        if (stockFilter === 'normal') return !isOutOfStock && !isLowStock
        return true
      })
    }

    return result
  }, [searchQuery, categoryFilter, brandFilter, stockFilter, initialVariants])

  // Aggregate stats in real-time
  const totalUnits = filteredVariants.reduce((sum, v) => sum + v.stock_quantity, 0)
  const totalCostValue = filteredVariants.reduce((sum, v) => sum + (v.stock_quantity * Number(v.cost)), 0)
  const totalRetailValue = filteredVariants.reduce((sum, v) => {
    const price = Number(v.price_override || v.product?.base_price || 0)
    return sum + (v.stock_quantity * price)
  }, 0)
  const totalProfitValue = totalRetailValue - totalCostValue

  const lowStockCount = filteredVariants.filter(
    (v: any) => v.stock_quantity <= v.stock_reorder_point && v.stock_quantity > 0
  ).length

  const handleResetFilters = () => {
    setSearchQuery('')
    setCategoryFilter('')
    setBrandFilter('')
    setStockFilter('all')
  }

  const handleExportExcel = async () => {
    const { exportToExcel } = await import('@/lib/export-utils')
    const rows = filteredVariants.map(v => {
      const price = Number(v.price_override || v.product?.base_price || 0)
      const cost = Number(v.cost)
      const isOutOfStock = v.stock_quantity <= 0
      const isLowStock = v.stock_quantity <= v.stock_reorder_point && v.stock_quantity > 0
      const statusLabel = isOutOfStock ? 'Agotado' : isLowStock ? 'Bajo Stock' : 'Normal'

      const baseRow: Record<string, any> = {
        'Producto': v.product?.name || '—',
        'SKU': v.sku,
        'Talla': v.size || '—',
        'Color': v.color || '—',
        'Categoría de Talla': v.product?.category?.name || '—',
        'Desc. Talla': v.product?.category?.description || '—',
        'Marca': v.product?.brand?.name || '—',
        'Stock': v.stock_quantity,
        'Precio Venta': price,
        'Valor Venta': v.stock_quantity * price,
        'Estado': statusLabel,
      }

      if (isAdmin) {
        baseRow['Costo Unitario'] = cost
        baseRow['Valor Costo'] = v.stock_quantity * cost
        baseRow['Ganancia Estimada'] = v.stock_quantity * (price - cost)
      }

      return baseRow
    })

    await exportToExcel(
      rows,
      `Reporte_Valorizacion_Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`,
      'Valorización'
    )
  }

  const handleExportPDF = async () => {
    const { exportInventoryPDF } = await import('@/lib/export-utils')
    const rows = filteredVariants.map(v => {
      const price = Number(v.price_override || v.product?.base_price || 0)
      const cost = Number(v.cost)
      const isOutOfStock = v.stock_quantity <= 0
      const isLowStock = v.stock_quantity <= v.stock_reorder_point && v.stock_quantity > 0
      const statusLabel = isOutOfStock ? 'Agotado' : isLowStock ? 'Bajo Stock' : 'Normal'

      return {
        nombre: v.product?.name || '—',
        sku: v.sku,
        talla: v.size || '—',
        color: v.color || '—',
        categoria: v.product?.category?.name || '—',
        descTalla: v.product?.category?.description || '',
        marca: v.product?.brand?.name || '—',
        stock: v.stock_quantity,
        costo: cost,
        precio: price,
        estado: statusLabel,
      }
    })

    await exportInventoryPDF(rows, isAdmin)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight uppercase">Reporte de Inventario</h1>
          <p className="text-muted-foreground font-mono text-xs">
            Valorización de stock, margen potencial y alertas de stock bajo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
        </div>
      </div>

      {/* Dynamic KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-display font-black text-foreground">{totalUnits}</p>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Total Unidades</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="border-border bg-card">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xl font-display font-black text-success">{formatCurrency(totalCostValue)}</p>
                  <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Valor en Costo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xl font-display font-black text-warning">{formatCurrency(totalRetailValue)}</p>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Valor Venta Est.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin ? (
          <Card className="border-border bg-card">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-display font-black text-blue-600">{formatCurrency(totalProfitValue)}</p>
                  <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Ganancia Potencial</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xl font-display font-black text-destructive">{lowStockCount}</p>
                  <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Bajo Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters Section */}
      <div className="bg-card border border-border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Search bar */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nombre de producto, SKU..."
                className="pl-9 h-10 text-sm bg-background border-border focus-visible:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category Selector */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Talla</label>
            <select
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Todas</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.description ? ` — ${c.description}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Selector */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Marca</label>
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

          {/* Stock Status Selector */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Stock</label>
            <select
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockStatusFilter)}
            >
              <option value="all">Todos</option>
              <option value="out_of_stock">Agotado</option>
              <option value="low_stock">Stock Bajo</option>
              <option value="normal">Normal</option>
            </select>
          </div>

          {/* Reset Filters button */}
          <div className="md:col-span-2">
            {hasFilters && (
              <button
                onClick={handleResetFilters}
                className="w-full h-10 text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center gap-1.5 bg-secondary/50 border border-border text-foreground hover:bg-secondary cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display font-black text-sm uppercase tracking-wide">
              Valorización de Stock por Variante ({filteredVariants.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View (< 768px) */}
          <div className="block md:hidden space-y-3">
            {filteredVariants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground font-mono text-xs bg-background/50 border border-border p-4">
                No hay variantes que coincidan con los filtros aplicados.
              </div>
            ) : (
              filteredVariants.map((v: any) => {
                const price = Number(v.price_override || v.product?.base_price || 0)
                const cost = Number(v.cost)
                const costVal = v.stock_quantity * cost
                const saleVal = v.stock_quantity * price
                const profitEst = saleVal - costVal

                const isOutOfStock = v.stock_quantity <= 0
                const isLowStock = v.stock_quantity <= v.stock_reorder_point && v.stock_quantity > 0

                return (
                  <div key={v.id} className="bg-background border border-border p-3.5 space-y-2.5 text-xs shadow-sm">
                    <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2">
                      <div>
                        <p className="font-bold text-foreground text-sm">{v.product?.name}</p>
                        <p className="font-mono text-muted-foreground text-[11px]">SKU: {v.sku}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase shrink-0 ${
                          isOutOfStock
                            ? 'bg-destructive/15 text-destructive'
                            : isLowStock
                            ? 'bg-warning/15 text-warning'
                            : 'bg-success/15 text-success'
                        }`}
                      >
                        {isOutOfStock ? 'Agotado' : isLowStock ? 'Bajo' : 'Normal'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-muted-foreground font-mono text-[11px]">
                      <div>
                        <span className="text-foreground font-semibold">Talla:</span> {v.product?.category?.name || '—'}
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Stock:</span> <span className="font-bold text-foreground">{v.stock_quantity} uds</span>
                      </div>
                      <div>
                        <span className="text-foreground font-semibold">Precio:</span> {formatCurrency(price)}
                      </div>
                      {isAdmin && (
                        <div>
                          <span className="text-foreground font-semibold">Costo:</span> {formatCurrency(cost)}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between font-mono text-xs">
                      <span className="text-muted-foreground">Valor Venta Total:</span>
                      <span className="font-bold text-foreground">{formatCurrency(saleVal)}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="text-muted-foreground">Ganancia Estimada:</span>
                        <span className="font-bold text-success">{formatCurrency(profitEst)}</span>
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
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Producto</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">SKU</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-center whitespace-nowrap">Talla/Color</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Talla</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Desc. Talla</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-center whitespace-nowrap">Stock</TableHead>
                  {isAdmin && <TableHead className="font-mono text-xs uppercase text-right whitespace-nowrap">Costo Unit.</TableHead>}
                  <TableHead className="font-mono text-xs uppercase text-right whitespace-nowrap">Precio Venta</TableHead>
                  {isAdmin && <TableHead className="font-mono text-xs uppercase text-right whitespace-nowrap">Valor Costo</TableHead>}
                  <TableHead className="font-mono text-xs uppercase text-right whitespace-nowrap">Valor Venta</TableHead>
                  {isAdmin && <TableHead className="font-mono text-xs uppercase text-right whitespace-nowrap">Ganancia Est.</TableHead>}
                  <TableHead className="font-mono text-xs uppercase text-center whitespace-nowrap">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVariants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 12 : 8} className="text-center py-8 text-muted-foreground font-mono text-xs">
                      No hay variantes que coincidan con los filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVariants.map((v: any) => {
                    const price = Number(v.price_override || v.product?.base_price || 0)
                    const cost = Number(v.cost)
                    const costVal = v.stock_quantity * cost
                    const saleVal = v.stock_quantity * price
                    const profitEst = saleVal - costVal

                    const isOutOfStock = v.stock_quantity <= 0
                    const isLowStock = v.stock_quantity <= v.stock_reorder_point && v.stock_quantity > 0

                    return (
                      <TableRow key={v.id} className="font-sans text-xs">
                        <TableCell className="font-semibold text-foreground whitespace-nowrap">{v.product?.name}</TableCell>
                        <TableCell className="font-mono text-muted-foreground whitespace-nowrap">{v.sku}</TableCell>
                        <TableCell className="text-center font-mono text-muted-foreground whitespace-nowrap">
                          {v.size ? `T: ${v.size}` : '—'} {v.color ? `· ${v.color}` : ''}
                        </TableCell>
                        <TableCell className="text-xs font-semibold whitespace-nowrap">
                          {v.product?.category?.name || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {v.product?.category?.description || '—'}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-foreground whitespace-nowrap">
                          {v.stock_quantity}
                        </TableCell>
                        {isAdmin && <TableCell className="text-right font-mono whitespace-nowrap">{formatCurrency(cost)}</TableCell>}
                        <TableCell className="text-right font-mono whitespace-nowrap">{formatCurrency(price)}</TableCell>
                        {isAdmin && <TableCell className="text-right font-mono text-muted-foreground whitespace-nowrap">{formatCurrency(costVal)}</TableCell>}
                        <TableCell className="text-right font-mono font-semibold text-foreground whitespace-nowrap">{formatCurrency(saleVal)}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-right font-mono font-bold text-success whitespace-nowrap">
                            {formatCurrency(profitEst)}
                          </TableCell>
                        )}
                        <TableCell className="text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                              isOutOfStock
                                ? 'bg-destructive/15 text-destructive'
                                : isLowStock
                                ? 'bg-warning/15 text-warning'
                                : 'bg-success/15 text-success'
                            }`}
                          >
                            {isOutOfStock ? 'Agotado' : isLowStock ? 'Bajo' : 'Normal'}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
