'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Package, Award, ArrowDownAZ, Search, RotateCcw, Calendar, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ExportButton } from '@/components/shared/export-button'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

interface ProductRankingItem {
  productId: string
  name: string
  sku: string
  category: string
  categoryDescription: string
  brand: string
  categoryId: string
  brandId: string
  unitsSold: number
  revenue: number
}

interface TopProductsReportClientProps {
  initialData: ProductRankingItem[]
  categories: Category[]
  brands: Brand[]
  startDate: string
  endDate: string
}

export function TopProductsReportClient({
  initialData,
  categories,
  brands,
  startDate,
  endDate,
}: TopProductsReportClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [dateStart, setDateStart] = useState(startDate)
  const [dateEnd, setDateEnd] = useState(endDate)

  const [categoryFilter, setCategoryFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [isMounted, setIsMounted] = useState(false)
  const [chartKey, setChartKey] = useState(0)

  useEffect(() => {
    setIsMounted(true)

    // Force chart re-mount on focus/visibility change to clear stuck tooltips/drag states
    const handleReset = () => {
      setChartKey(k => k + 1)
    }
    window.addEventListener('focus', handleReset)
    document.addEventListener('visibilitychange', handleReset)
    return () => {
      window.removeEventListener('focus', handleReset)
      document.removeEventListener('visibilitychange', handleReset)
    }
  }, [])

  // Sync date changes with URL to fetch new server-side data
  const handleDateChange = (start: string, end: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('startDate', start)
    params.set('endDate', end)
    router.push(`${pathname}?${params.toString()}`)
  }

  const hasFilters =
    categoryFilter ||
    brandFilter ||
    searchQuery ||
    dateStart !== startDate ||
    dateEnd !== endDate

  const filteredData = useMemo(() => {
    let result = [...initialData]

    // 1. Text Search (name or sku)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
      )
    }

    // 2. Category Filter
    if (categoryFilter) {
      result = result.filter(item => item.categoryId === categoryFilter)
    }

    // 3. Brand Filter
    if (brandFilter) {
      result = result.filter(item => item.brandId === brandFilter)
    }

    // Sort by revenue descending (ranking)
    return result.sort((a, b) => b.revenue - a.revenue)
  }, [searchQuery, categoryFilter, brandFilter, initialData])

  // Aggregate metrics
  const totalUnitsSold = filteredData.reduce((sum, item) => sum + item.unitsSold, 0)
  const totalRevenueGenerated = filteredData.reduce((sum, item) => sum + item.revenue, 0)

  // Recharts horizontal chart data (top 10 products by revenue)
  const chartData = useMemo(() => {
    return filteredData
      .slice(0, 10)
      .map(item => ({
        name: item.name.length > 18 ? item.name.substring(0, 15) + '...' : item.name,
        Ingresos: item.revenue,
        Unidades: item.unitsSold,
      }))
      .reverse() // show highest at top of horizontal bar
  }, [filteredData])

  const handleResetFilters = () => {
    setSearchQuery('')
    setCategoryFilter('')
    setBrandFilter('')
    const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const defaultEnd = new Date().toISOString().split('T')[0]
    setDateStart(defaultStart)
    setDateEnd(defaultEnd)
    handleDateChange(defaultStart, defaultEnd)
  }

  const handleExportExcel = async () => {
    const { exportToExcel } = await import('@/lib/export-utils')
    const rows = filteredData.map((item, index) => ({
      'Ranking': index + 1,
      'Producto': item.name,
      'SKU': item.sku,
      'Talla': item.category,
      'Desc. Talla': item.categoryDescription || '—',
      'Marca': item.brand,
      'Unidades Vendidas': item.unitsSold,
      'Ingreso Neto': item.revenue,
    }))

    await exportToExcel(
      rows,
      `Reporte_Productos_Mas_Vendidos_${new Date().toISOString().slice(0, 10)}.xlsx`,
      'Ranking'
    )
  }

  const handleExportPDF = async () => {
    const { exportTopProductsPDF } = await import('@/lib/export-utils')
    const rows = filteredData.map((item, index) => ({
      ranking: index + 1,
      nombre: item.name,
      sku: item.sku,
      categoria: item.category,
      descTalla: item.categoryDescription || '',
      marca: item.brand,
      unidades: item.unitsSold,
      monto: item.revenue,
    }))

    const dateRange = `Desde ${dateStart} hasta ${dateEnd}`

    await exportTopProductsPDF(rows, { dateRange })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight uppercase">Productos Más Vendidos</h1>
          <p className="text-muted-foreground font-mono text-xs">
            Ranking de artículos ordenados por volumen de venta e ingresos generados.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
        </div>
      </div>

      {/* Aggregated totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-display font-black text-foreground">{totalUnitsSold}</p>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Unidades Totales Vendidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-display font-black text-success">{formatCurrency(totalRevenueGenerated)}</p>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Ingresos Netos Generados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recharts chart */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-display font-black text-sm uppercase tracking-wide">
            Top 10 Productos por Ingreso
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          {isMounted ? (
            <ResponsiveContainer key={chartKey} width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  style={{ fontSize: 10, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(val) => `C$ ${val}`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  style={{ fontSize: 10, fontFamily: 'sans-serif', fontWeight: 'bold', fill: 'hsl(var(--foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 0,
                    fontSize: 12,
                  }}
                  formatter={(val, name) => [
                    name === 'Ingresos' ? formatCurrency(Number(val)) : `${val} uds`,
                    name,
                  ]}
                />
                <Bar dataKey="Ingresos" fill="hsl(var(--primary))" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-xs">
              Cargando gráfico...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters form */}
      <div className="bg-card border border-border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Date range inputs */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Desde</label>
            <Input
              type="date"
              className="h-10 text-sm bg-background border-border"
              value={dateStart}
              onChange={(e) => {
                setDateStart(e.target.value)
                if (e.target.value && dateEnd) handleDateChange(e.target.value, dateEnd)
              }}
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Hasta</label>
            <Input
              type="date"
              className="h-10 text-sm bg-background border-border"
              value={dateEnd}
              onChange={(e) => {
                setDateEnd(e.target.value)
                if (dateStart && e.target.value) handleDateChange(dateStart, e.target.value)
              }}
            />
          </div>

          {/* Search bar */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">Buscar Producto</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nombre, SKU..."
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
                  {(c as any).description ? `${c.name} — ${(c as any).description}` : c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Selector */}
          <div className="md:col-span-1 space-y-1.5">
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

          {/* Reset Filters button */}
          <div className="md:col-span-1">
            {hasFilters && (
              <button
                onClick={handleResetFilters}
                className="w-full h-10 text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center gap-1.5 bg-secondary/50 border border-border text-foreground hover:bg-secondary cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ranking Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-display font-black text-sm uppercase tracking-wide">
            Ranking Completo de Productos ({filteredData.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View (< 768px) */}
          <div className="block md:hidden space-y-3">
            {filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground font-mono text-xs bg-background/50 border border-border p-4">
                No hay registros en el período seleccionado.
              </div>
            ) : (
              filteredData.map((item, index) => (
                <div key={item.productId} className="bg-background border border-border p-3.5 space-y-2.5 text-xs shadow-sm">
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center gap-1 font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 text-xs">
                        <Award className="h-3.5 w-3.5 text-warning" />
                        #{index + 1}
                      </span>
                      <p className="font-bold text-foreground text-sm">{item.name}</p>
                    </div>
                    <span className="font-mono text-muted-foreground text-[11px]">SKU: {item.sku}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-muted-foreground font-mono text-[11px]">
                    <div>
                      <span className="text-foreground font-semibold">Talla:</span> {item.category}
                    </div>
                    <div>
                      <span className="text-foreground font-semibold">Marca:</span> {item.brand}
                    </div>
                    <div>
                      <span className="text-foreground font-semibold">Vendidas:</span> <span className="font-bold text-foreground">{item.unitsSold} uds</span>
                    </div>
                    <div>
                      <span className="text-foreground font-semibold">Ingreso:</span> <span className="font-bold text-success">{formatCurrency(item.revenue)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase text-center w-16 whitespace-nowrap">Puesto</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Producto</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">SKU Variante</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Talla</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Desc. Talla</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Marca</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-center whitespace-nowrap">Uds. Vendidas</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-right whitespace-nowrap">Ingreso Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground font-mono text-xs">
                      No hay registros en el período seleccionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, index) => (
                    <TableRow key={item.productId} className="text-xs">
                      <TableCell className="text-center font-mono font-bold text-primary whitespace-nowrap">
                        <span className="flex items-center justify-center gap-1">
                          <Award className="h-3.5 w-3.5 text-warning" />
                          {index + 1}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground whitespace-nowrap">{item.name}</TableCell>
                      <TableCell className="font-mono text-muted-foreground whitespace-nowrap">{item.sku}</TableCell>
                      <TableCell className="font-mono text-muted-foreground whitespace-nowrap">{item.category}</TableCell>
                      <TableCell className="text-muted-foreground text-[11px] whitespace-nowrap">{item.categoryDescription || '—'}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{item.brand}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-foreground whitespace-nowrap">
                        {item.unitsSold}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-success whitespace-nowrap">
                        {formatCurrency(item.revenue)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
