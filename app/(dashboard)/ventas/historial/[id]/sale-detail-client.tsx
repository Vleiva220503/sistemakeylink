'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  ShieldAlert,
  Loader2,
  Calendar,
  User,
  Store,
  CreditCard,
  Banknote,
  BadgeDollarSign,
  Package,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatCurrency, cn } from '@/lib/utils'
import { voidSale } from '@/app/actions/sales'
import { toast } from 'sonner'
import type { InvoiceData } from '@/lib/generate-invoice-pdf'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SaleVariant {
  id: string
  sku: string
  size: string | null
  color: string | null
  quality: string | null
  product: {
    id: string
    name: string
    sku: string
    category?: { name: string; description?: string | null } | null
  } | null
}

interface SaleItem {
  id: string
  quantity: number
  unit_price: number
  discount_amount: number
  total: number
  variant: SaleVariant | null
}

interface Payment {
  id: string
  method: string
  amount: number
  reference: string | null
}

interface SaleDetail {
  id: string
  sale_number: string
  status: string
  subtotal: number
  discount_amount: number
  discount_type: string | null
  total: number
  amount_paid: number
  amount_pending: number
  notes: string | null
  created_at: string
  completed_at: string | null
  customer: { id: string; name: string; phone?: string; email?: string } | null
  register: { id: string; name: string } | null
  cajero: { id: string; full_name: string } | null
  sale_items: SaleItem[]
  payments: Payment[]
}

interface SaleDetailClientProps {
  sale: SaleDetail
  isAdmin: boolean
  currentCashierName: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  icon: React.ReactNode
  color: string
}> = {
  completed: {
    label: 'Completada',
    variant: 'default',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-success',
  },
  pending: {
    label: 'Pendiente',
    variant: 'secondary',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-warning',
  },
  cancelled: {
    label: 'Anulada',
    variant: 'destructive',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-destructive',
  },
  partial: {
    label: 'Pago Parcial',
    variant: 'outline',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-warning',
  },
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mobile_payment: 'Pago Móvil',
  other: 'Otro',
}

function PaymentIcon({ method }: { method: string }) {
  if (method === 'cash' || method === 'other') return <Banknote className="h-4 w-4 text-success" />
  return <CreditCard className="h-4 w-4 text-primary" />
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function SaleDetailClient({ sale, isAdmin, currentCashierName }: SaleDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const statusConfig = STATUS_CONFIG[sale.status] || {
    label: sale.status,
    variant: 'outline' as const,
    icon: null,
    color: '',
  }

  const totalUnits = sale.sale_items.reduce((sum, item) => sum + item.quantity, 0)

  // ─── PDF Generation ──────────────────────────────────────────────────────────

  async function handleGeneratePDF() {
    setIsGeneratingPDF(true)
    try {
      const { generateInvoicePDF } = await import('@/lib/generate-invoice-pdf')

      const primaryPayment = sale.payments?.[0]?.method ?? 'cash'
      const cashierName = sale.cajero?.full_name || currentCashierName

      const invoiceData: InvoiceData = {
        saleNumber: sale.sale_number,
        date: new Date(sale.created_at),
        registerName: sale.register?.name ?? 'Caja',
        cashierName,
        paymentMethod: primaryPayment,
        items: sale.sale_items.map((item) => {
          const variantLabel = [
            item.variant?.product?.name ?? 'Producto',
            item.variant?.size ? `T: ${item.variant.size}` : null,
            item.variant?.color ?? null,
            item.variant?.quality ?? null,
          ].filter(Boolean).join(' — ')

          return {
            name: variantLabel,
            sku: item.variant?.sku ?? '—',
            talla: item.variant?.product?.category?.name ?? null,
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            discount: Number(item.discount_amount ?? 0),
          }
        }),
        subtotal: Number(sale.subtotal),
        discountTotal: Number(sale.discount_amount),
        total: Number(sale.total),
        customerName: sale.customer?.name ?? null,
        notes: sale.notes ?? null,
      }

      await generateInvoicePDF(invoiceData)
      toast.success('Factura PDF generada y descargada correctamente.')
    } catch (err) {
      console.error('Error generando factura PDF:', err)
      toast.error('Error al generar la factura PDF. Intenta de nuevo.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // ─── Void Sale ───────────────────────────────────────────────────────────────

  function handleVoid() {
    startTransition(async () => {
      const res = await voidSale(sale.id)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(`Venta ${sale.sale_number} anulada. Stock restaurado.`)
        router.refresh()
      }
    })
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Back + Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link
          href="/ventas/historial"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "self-start")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver al historial
        </Link>

        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-display font-black uppercase tracking-tight">
              Venta <span className="text-primary font-mono">#{sale.sale_number}</span>
            </h1>
            <Badge variant={statusConfig.variant} className="flex items-center gap-1.5">
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(sale.created_at).toLocaleDateString('es-NI', {
              timeZone: 'America/Managua',
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2"
          >
            {isGeneratingPDF ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {isGeneratingPDF ? 'Generando...' : 'Descargar Factura PDF'}
          </Button>

          {isAdmin && sale.status !== 'cancelled' && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive text-destructive hover:bg-destructive/10 flex items-center gap-2"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldAlert className="h-4 w-4" />
                    )}
                    {isPending ? 'Anulando...' : 'Anular Venta'}
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <ShieldAlert className="h-5 w-5" />
                    ¿Anular Venta {sale.sale_number}?
                  </AlertDialogTitle>
                  <AlertDialogDescription render={<div />} className="space-y-2 text-sm text-muted-foreground">
                    <p>Esta acción es irreversible y realizará las siguientes operaciones:</p>
                    <ul className="list-disc list-inside text-xs space-y-1 bg-secondary/35 p-3.5 border rounded-lg font-sans">
                      <li>Marcará la venta como <strong>Cancelada</strong>.</li>
                      <li>Reincorporará <strong>{totalUnits} unidades</strong> al stock físico disponible.</li>
                      <li>Registrará el movimiento de reversión en el historial de inventario.</li>
                      <li>Si se pagó en efectivo, restará el monto total de la caja del día.</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleVoid}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    Sí, anular venta
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Sale cancelled banner */}
      {sale.status === 'cancelled' && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
          <XCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Venta Anulada</p>
            <p className="text-xs opacity-80">Esta venta fue cancelada. El stock fue restaurado automáticamente.</p>
          </div>
        </div>
      )}

      {/* Top 3 info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Customer */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Cliente</p>
                <p className="font-semibold text-sm truncate">{sale.customer?.name ?? 'Cliente General'}</p>
                {sale.customer?.phone && (
                  <p className="text-xs text-muted-foreground">{sale.customer.phone}</p>
                )}
                {sale.customer?.email && (
                  <p className="text-xs text-muted-foreground truncate">{sale.customer.email}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Register / Cashier */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Store className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Caja / Cajero</p>
                <p className="font-semibold text-sm">{sale.register?.name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{sale.cajero?.full_name ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Receipt className="h-4 w-4 text-primary" />
              </div>
              <div className="w-full min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Pagos</p>
                <div className="space-y-1">
                  {sale.payments && sale.payments.length > 0 ? (
                    sale.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-1.5">
                          <PaymentIcon method={p.method} />
                          <span>{PAYMENT_LABELS[p.method] ?? p.method}</span>
                        </div>
                        <span className="font-mono font-bold text-xs">{formatCurrency(Number(p.amount))}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Sin pagos registrados</p>
                  )}
                  {Number(sale.amount_pending) > 0 && (
                    <div className="flex items-center justify-between gap-2 text-sm text-warning border-t border-warning/20 pt-1 mt-1">
                      <span className="text-xs font-medium">Pendiente</span>
                      <span className="font-mono font-bold text-xs">{formatCurrency(Number(sale.amount_pending))}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="flex items-center gap-2 text-base font-display font-black uppercase">
            <Package className="h-5 w-5 text-primary" />
            Artículos Vendidos
            <span className="text-xs font-mono font-normal text-muted-foreground ml-auto">
              {totalUnits} unidad{totalUnits !== 1 ? 'es' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 pl-4">Producto / Variante</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">SKU</th>
                  <th className="text-center text-xs font-medium text-muted-foreground p-3">Cant.</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-3">P. Unit.</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-3">Desc.</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-3 pr-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.sale_items.map((item, idx) => {
                  const productName = item.variant?.product?.name ?? 'Producto eliminado'
                  const attrs = [
                    item.variant?.size ? `T: ${item.variant.size}` : null,
                    item.variant?.color ?? null,
                    item.variant?.quality ?? null,
                  ].filter(Boolean).join(' · ')

                  return (
                    <tr key={item.id} className={`border-b last:border-0 ${idx % 2 === 0 ? '' : 'bg-muted/10'} hover:bg-muted/20 transition-colors`}>
                      <td className="p-3 pl-4">
                        <p className="font-medium text-sm">{productName}</p>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          {item.variant?.product?.category?.name && (
                            <p className="text-xs text-primary font-semibold">
                              Talla Padre: {item.variant.product.category.name}
                              {item.variant.product.category.description ? ` (${item.variant.product.category.description})` : ''}
                            </p>
                          )}
                          {attrs && <p className="text-xs text-muted-foreground">{attrs}</p>}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-xs text-muted-foreground">{item.variant?.sku ?? '—'}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-mono font-bold text-sm">{item.quantity}</span>
                      </td>
                      <td className="p-3 text-right font-mono text-sm">
                        {formatCurrency(Number(item.unit_price))}
                      </td>
                      <td className="p-3 text-right text-sm">
                        {Number(item.discount_amount) > 0 ? (
                          <span className="text-destructive font-mono">-{formatCurrency(Number(item.discount_amount))}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 pr-4 text-right font-mono font-bold text-sm">
                        {formatCurrency(Number(item.total))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Totals block */}
      <div className="flex justify-end">
        <Card className="w-full sm:w-72">
          <CardContent className="pt-4 space-y-2 text-sm font-mono">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(sale.subtotal))}</span>
            </div>
            {Number(sale.discount_amount) > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Descuento</span>
                <span>-{formatCurrency(Number(sale.discount_amount))}</span>
              </div>
            )}
            <hr className="border-border" />
            <div className="flex justify-between font-display font-black text-lg">
              <span>TOTAL</span>
              <span className="text-primary">{formatCurrency(Number(sale.total))}</span>
            </div>
            {Number(sale.amount_pending) > 0 && (
              <>
                <hr className="border-border" />
                <div className="flex justify-between text-warning font-medium text-xs">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Saldo pendiente
                  </span>
                  <span>{formatCurrency(Number(sale.amount_pending))}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {sale.notes && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notas</p>
            <p className="text-sm">{sale.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
