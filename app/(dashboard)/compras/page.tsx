import { createClient } from '@/lib/supabase/server'
import { ShoppingBag, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PurchaseForm } from '@/app/(dashboard)/compras/purchase-form'
import { PurchasesListClient } from './purchases-list-client'

interface PageProps {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
    page?: string
  }>
}

const PAGE_SIZE = 50

export default async function ComprasPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { startDate, endDate, page: pageParam } = await searchParams
  const currentPage = Math.max(0, parseInt(pageParam || '0', 10))
  const from = currentPage * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('purchases')
    .select(`
      id, reference_number, status, order_date, expected_date, notes, created_at,
      supplier:suppliers(id, name),
      purchase_items(id, quantity_ordered, quantity_received, unit_cost)
    `)

  if (startDate) {
    query = query.gte('order_date', startDate)
  }
  if (endDate) {
    query = query.lte('order_date', endDate)
  }

  const [{ data: purchaseRows, count: totalCount }, { data: supplierRows }, { data: variantRows }] = await Promise.all([
    query.order('created_at', { ascending: false }).range(from, to),
    supabase.from('suppliers').select('id, name').eq('is_active', true).order('name'),
    supabase.from('product_variants').select(`
      id,
      sku,
      size,
      color,
      cost,
      product:products(name)
    `).eq('is_active', true).order('sku')
  ])

  const purchases = (purchaseRows as any[]) || []
  const suppliers = supplierRows || []
  const variants = variantRows || []
  const safeTotal = totalCount ?? 0

  // Lightweight query for full KPIs across the entire filtered period
  const { data: kpiRows } = await query.select('status, purchase_items(quantity_ordered, unit_cost)')
  const kpiPurchases = (kpiRows as any[]) || []

  const pending = kpiPurchases.filter((p: any) => ['draft', 'ordered', 'partial'].includes(p.status))
  const received = kpiPurchases.filter((p: any) => p.status === 'received')
  const totalValue = kpiPurchases.reduce((sum: number, p: any) => {
    const items = p.purchase_items || []
    return sum + items.reduce((s: number, i: any) => s + i.quantity_ordered * i.unit_cost, 0)
  }, 0)

  function formatCurrency(n: number) {
    return new Intl.NumberFormat('es', { style: 'currency', currency: 'USD' }).format(n)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Compras</h1>
          <p className="text-muted-foreground">Órdenes de compra y recepción de mercadería</p>
        </div>
        <PurchaseForm suppliers={suppliers} variants={variants} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{purchases.length}</p>
                <p className="text-xs text-muted-foreground">Total Órdenes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xl font-bold text-warning">{pending.length}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-bold text-success">{received.length}</p>
                <p className="text-xs text-muted-foreground">Recibidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div>
              <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
              <p className="text-xs text-muted-foreground">Valor Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <PurchasesListClient initialPurchases={purchases} totalCount={safeTotal} currentPage={currentPage} pageSize={PAGE_SIZE} />
    </div>
  )
}
