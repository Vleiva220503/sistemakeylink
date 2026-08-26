'use client'

import { useState, useMemo } from 'react'
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Receipt, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createSale } from '@/app/actions/sales'
import { formatCurrency } from '@/lib/utils'
import { SafeImage } from '@/components/shared/safe-image'
import { resolveProductImage } from '@/lib/resolve-product-image'
import type { InvoiceData } from '@/lib/generate-invoice-pdf'

// Real types from Supabase schema
export type PosVariant = {
  id: string              // variant_id
  sku: string
  size: string | null
  color: string | null
  quality: string | null
  price_override: number | null
  stock_quantity: number
  cost: number
  product: {
    id: string
    name: string
    sku: string
    base_price: number
    brand?: { name: string; logo_url?: string | null } | null
    category?: { name: string; description?: string | null } | null
    product_images?: { url: string; is_primary: boolean; sort_order: number }[]
  }
}

type CartItem = {
  variant_id: string
  name: string           // product name + size/color
  sku: string
  talla: string | null
  tallaDescription: string | null
  price: number
  stock: number
  quantity: number
  cost: number
  discount_val: number
  discount_type: 'percentage' | 'fixed'
  discount_amount: number
  confirmedLoss: boolean
}

interface PosTerminalProps {
  registerId: string
  registerName: string
  variants: PosVariant[]
}

function getEffectivePrice(v: PosVariant): number {
  return v.price_override ?? v.product?.base_price ?? 0
}

function getVariantLabel(v: PosVariant): string {
  const parts = [v.product?.name]
  if (v.size) parts.push(`T: ${v.size}`)
  if (v.color) parts.push(v.color)
  if (v.quality) parts.push(v.quality)
  return parts.filter(Boolean).join(' — ')
}

// Panel heights: dynamically fit within available viewport height
const PANEL_H = {
  mobile: 'calc(100dvh - 190px)',  // mobile: optimized height fit
  desktop: 'calc(100dvh - 150px)', // desktop: optimized height fit
}

export function PosTerminal({ registerId, registerName, variants }: PosTerminalProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'cart'>('catalog')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  const [deliveryAmount, setDeliveryAmount] = useState<number>(0)
  const [customerName, setCustomerName] = useState<string>('')
  const [isOptionsOpen, setIsOptionsOpen] = useState<boolean>(false)

  const filteredVariants = useMemo(() => {
    if (!searchQuery.trim()) return variants
    const q = searchQuery.toLowerCase()
    return variants.filter(v =>
      v.product?.name?.toLowerCase().includes(q) ||
      v.sku?.toLowerCase().includes(q) ||
      v.product?.sku?.toLowerCase().includes(q) ||
      v.size?.toLowerCase().includes(q) ||
      v.color?.toLowerCase().includes(q) ||
      v.product?.brand?.name?.toLowerCase().includes(q) ||
      v.product?.category?.name?.toLowerCase().includes(q) ||
      v.product?.category?.description?.toLowerCase().includes(q)
    )
  }, [searchQuery, variants])

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity - item.discount_amount), 0)
  const total = subtotal + deliveryAmount

  const hasUnconfirmedLoss = useMemo(() => {
    return cart.some(item => {
      const effectiveUnitPrice = item.price - (item.discount_amount / item.quantity)
      return effectiveUnitPrice < item.cost && !item.confirmedLoss
    })
  }, [cart])

  const addToCart = (variant: PosVariant) => {
    const existing = cart.find(item => item.variant_id === variant.id)
    const currentQty = existing ? existing.quantity : 0
    if (currentQty >= variant.stock_quantity) {
      toast.error(`Stock insuficiente. Disponible: ${variant.stock_quantity} pares`)
      return
    }
    const price = getEffectivePrice(variant)
    setCart(prev => {
      const exists = prev.find(item => item.variant_id === variant.id)
      if (exists) {
        return prev.map(item => {
          if (item.variant_id !== variant.id) return item
          const newQ = item.quantity + 1
          let amount = 0
          if (item.discount_type === 'percentage') {
            amount = Math.min(item.price * newQ, Number(((item.discount_val / 100) * item.price * newQ).toFixed(2)))
          } else {
            amount = Math.min(item.price * newQ, item.discount_val)
          }
          return { ...item, quantity: newQ, discount_amount: amount }
        })
      }
      return [...prev, {
        variant_id: variant.id,
        name: getVariantLabel(variant),
        sku: variant.sku,
        talla: variant.product?.category?.name ?? null,
        tallaDescription: variant.product?.category?.description ?? null,
        price,
        stock: variant.stock_quantity,
        quantity: 1,
        cost: variant.cost ?? 0,
        discount_val: 0,
        discount_type: 'fixed',
        discount_amount: 0,
        confirmedLoss: false
      }]
    })
    toast.success(`${variant.product?.name} agregado al carrito`, { duration: 1500 })
  }

  const handleUpdateDiscount = (variantId: string, val: number, type: 'percentage' | 'fixed') => {
    setCart(prev => prev.map(item => {
      if (item.variant_id !== variantId) return item
      let amount = 0
      if (type === 'percentage') {
        amount = Math.min(item.price * item.quantity, Number(((val / 100) * item.price * item.quantity).toFixed(2)))
      } else {
        amount = Math.min(item.price * item.quantity, val)
      }
      return { ...item, discount_val: val, discount_type: type, discount_amount: amount }
    }))
  }

  const handleConfirmLoss = (variantId: string, confirmed: boolean) => {
    setCart(prev => prev.map(item =>
      item.variant_id === variantId ? { ...item, confirmedLoss: confirmed } : item
    ))
  }

  const updateQuantity = (variantId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.variant_id !== variantId) return item
      const newQ = item.quantity + delta
      if (newQ < 1) return item
      if (newQ > item.stock) {
        toast.error(`Stock máximo disponible: ${item.stock} pares`)
        return item
      }
      let amount = 0
      if (item.discount_type === 'percentage') {
        amount = Math.min(item.price * newQ, Number(((item.discount_val / 100) * item.price * newQ).toFixed(2)))
      } else {
        amount = Math.min(item.price * newQ, item.discount_val)
      }
      return { ...item, quantity: newQ, discount_amount: amount }
    }))
  }

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(item => item.variant_id !== variantId))
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (hasUnconfirmedLoss) {
      toast.error('Tienes productos con precio menor al costo sin confirmar.')
      return
    }
    const cartSnapshot = [...cart]
    const totalSnapshot = total
    setIsProcessing(true)
    try {
      const result = await createSale({
        register_id: registerId,
        items: cartSnapshot.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.price,
          discount_amount: item.discount_amount,
          discount_type: item.discount_val > 0 ? item.discount_type : null
        })),
        payments: [{ amount: totalSnapshot, method: paymentMethod === 'cash' ? 'cash' : 'card', reference: null }],
        discount_amount: 0,
        discount_type: null,
        notes: null,
        delivery_amount: deliveryAmount,
        customer_name: customerName.trim() || 'Cliente Estándar'
      })
      if (result.error) {
        toast.error(`Error: ${result.error}`)
      } else {
        toast.success('¡Venta procesada! Generando factura PDF...', { duration: 3000 })
        setCart([])
        setSearchQuery('')
        try {
          const { generateInvoicePDF } = await import('@/lib/generate-invoice-pdf')
          const invoiceData: InvoiceData = {
            saleNumber: result.saleNumber ?? result.saleId ?? 'N/A',
            date: new Date(),
            registerName,
            cashierName: 'Cajero',
            paymentMethod,
            items: cartSnapshot.map(item => ({
              name: item.name,
              sku: item.sku,
              talla: item.talla,
              tallaDescription: item.tallaDescription,
              quantity: item.quantity,
              unitPrice: item.price,
              discount: item.discount_amount,
              discountType: item.discount_val > 0 ? item.discount_type : null,
              discountVal: item.discount_val
            })),
            subtotal: cartSnapshot.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            discountTotal: cartSnapshot.reduce((sum, item) => sum + item.discount_amount, 0),
            total: totalSnapshot,
            deliveryAmount: deliveryAmount > 0 ? deliveryAmount : undefined,
            customerName: customerName.trim() || null,
          }
          await generateInvoicePDF(invoiceData)
        } catch (pdfErr) {
          console.error('Error al generar PDF de factura:', pdfErr)
          toast.error('Venta guardada, pero falló la generación del PDF.')
        }
      }
    } catch {
      toast.error('Error inesperado al procesar la venta')
    } finally {
      setIsProcessing(false)
      setDeliveryAmount(0)
      setCustomerName('')
    }
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Mobile Tab Switcher (lg+ hidden) ── */}
      <div className="flex lg:hidden border border-border bg-card p-1 shrink-0">
        <button
          type="button"
          className={`flex-1 py-3 text-center text-sm font-display font-black uppercase tracking-wider transition-colors cursor-pointer ${
            activeTab === 'catalog' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('catalog')}
        >
          Catálogo
        </button>
        <button
          type="button"
          className={`flex-1 py-3 text-center text-sm font-display font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'cart' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('cart')}
        >
          <span>Carrito</span>
          {cart.length > 0 && (
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
              activeTab === 'cart' ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
            }`}>
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* ── Two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">

        {/* ═══════════════ CATALOG PANEL ═══════════════ */}
        <div
          className={`lg:col-span-2 flex flex-col border border-border bg-card overflow-hidden ${activeTab === 'catalog' ? '' : 'hidden lg:flex'}`}
          style={{ height: PANEL_H.mobile } as React.CSSProperties}
        >
          {/* Search bar */}
          <div className="px-4 pt-4 pb-3 border-b border-border bg-background/50 shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por nombre, talla, color, SKU o marca..."
                className="pl-11 h-12 text-sm font-sans bg-background border-border focus-visible:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-2">
              {filteredVariants.length} pares disponibles{searchQuery ? ` (filtrado de ${variants.length})` : ''}
            </p>
          </div>

          {/* Scrollable product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredVariants.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-mono text-xs text-center py-16">
                No se encontraron variantes disponibles
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-3">
                {filteredVariants.map(variant => {
                  const price = getEffectivePrice(variant)
                  const inCart = cart.find(c => c.variant_id === variant.id)
                  const img = resolveProductImage(variant.product)
                  return (
                    <div
                      key={variant.id}
                      className={`sneaker-card border rounded-none p-3 flex flex-col gap-2 bg-background ${inCart ? 'border-primary' : 'border-border'}`}
                    >
                      <div className="aspect-square w-full overflow-hidden bg-secondary/20 flex items-center justify-center">
                        <SafeImage src={img} alt={variant.product?.name} className="floating-sneaker-img object-contain w-full h-full" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold text-primary uppercase tracking-widest">
                          <span className="truncate mr-1">{variant.sku}</span>
                          {variant.product?.category?.name && (
                            <span className="text-muted-foreground font-semibold shrink-0 cursor-help" title={variant.product.category.description || undefined}>
                              T: {variant.product.category.name}
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-bold text-xs uppercase leading-tight text-foreground line-clamp-2 mt-0.5">
                          {variant.product?.name}
                        </h3>
                        {(variant.size || variant.color) && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {variant.size && <span className="size-btn px-2 py-0.5 text-[10px]">US {variant.size}</span>}
                            {variant.color && <span className="text-[10px] font-mono text-muted-foreground">{variant.color}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-auto">
                        <div>
                          <p className="font-display font-black text-sm text-primary">{formatCurrency(price)}</p>
                          <p className="text-[9px] font-mono text-muted-foreground">{variant.stock_quantity} pares</p>
                        </div>
                        <Button
                          type="button" size="icon" variant="outline"
                          className="h-9 w-9 rounded-none border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent cursor-pointer shrink-0"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(variant) }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {inCart && (
                        <div className="text-[10px] font-mono font-bold text-primary bg-primary/10 text-center py-0.5">
                          EN CARRITO: {inCart.quantity}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* "Go to cart" floating bar — mobile only, appears when cart has items */}
          {cart.length > 0 && (
            <div className="lg:hidden p-3 bg-background border-t border-border shrink-0">
              <Button
                type="button"
                onClick={() => setActiveTab('cart')}
                className="w-full h-12 text-sm font-display font-black uppercase tracking-wider flex items-center justify-between px-4 cursor-pointer"
                style={{ color: 'hsl(var(--primary-foreground))' }}
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>VER CARRITO ({cart.reduce((s, i) => s + i.quantity, 0)} PARES)</span>
                </div>
                <span className="font-mono">{formatCurrency(total)}</span>
              </Button>
            </div>
          )}
        </div>

        {/* ═══════════════ CART PANEL ═══════════════ */}
        <div
          className={`flex flex-col border border-border bg-card ${activeTab === 'cart' ? '' : 'hidden lg:flex'}`}
          style={{ height: PANEL_H.mobile } as React.CSSProperties}
        >
          {/* Cart header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/50 shrink-0">
            <div className="flex items-center gap-2 font-display font-black text-base uppercase">
              <Receipt className="h-5 w-5 text-primary" />
              <span>CARRITO</span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-1 bg-primary text-primary-foreground">
              {cart.reduce((s, i) => s + i.quantity, 0)} PARES
            </span>
          </div>

          {/* Scrollable cart items list */}
          <div
            tabIndex={0}
            className="flex-1 overflow-y-auto min-h-0 focus:outline-none focus:ring-1 focus:ring-primary/30"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          >
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
                <ShoppingCart className="h-10 w-10 opacity-20 mb-3" />
                <p className="text-xs font-display font-bold uppercase tracking-wider">CARRITO VACÍO</p>
                <p className="text-[11px] text-muted-foreground mt-1">Selecciona los pares del catálogo</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {cart.map(item => {
                  const lineSubtotal = item.price * item.quantity - item.discount_amount
                  const effectiveUnitPrice = item.quantity > 0 ? (item.price * item.quantity - item.discount_amount) / item.quantity : 0
                  const isLoss = effectiveUnitPrice < item.cost
                  return (
                    <div key={item.variant_id} className="p-3.5 flex flex-col gap-2.5 bg-background/30">

                      {/* Line 1 (Mobile & Desktop): Product Name + Talla Badge + SKU + Remove Button */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-display font-bold text-sm uppercase text-foreground leading-snug break-words">
                              {item.name}
                            </span>
                            {item.talla && (
                              <span
                                className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded cursor-help shrink-0"
                                title={item.tallaDescription || undefined}
                              >
                                T: {item.talla}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                            SKU: {item.sku}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.variant_id)}
                          className="h-8 w-8 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-none shrink-0 cursor-pointer transition-colors -mr-1 -mt-1"
                          aria-label="Eliminar del carrito"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Line 2 (Mobile & Desktop): Qty Stepper, Unit Price, Line Discount indicator & Line Subtotal */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
                        {/* Quantity Stepper */}
                        <div className="flex items-center border border-border bg-background">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variant_id, -1)}
                            className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors border-r border-border"
                            aria-label="Reducir cantidad"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center font-mono text-sm font-bold select-none">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variant_id, 1)}
                            className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors border-l border-border"
                            aria-label="Aumentar cantidad"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Price & Subtotal */}
                        <div className="text-right flex flex-col justify-center">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {formatCurrency(item.price)} c/u
                            </span>
                            {item.discount_amount > 0 && (
                              <span className="text-[10px] font-mono text-destructive font-semibold">
                                (-{formatCurrency(item.discount_amount)})
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-sm font-bold text-foreground">
                            Subtotal: <span className="text-primary font-black">{formatCurrency(lineSubtotal)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Line 3: Expandable/Compact Discount controls */}
                      <div className="border border-border/60 bg-secondary/5 p-2.5 flex flex-col gap-2 mt-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                            Descuento por línea
                          </span>
                          {item.discount_amount > 0 && (
                            <span className="text-xs font-mono text-destructive font-bold">
                              −{formatCurrency(item.discount_amount)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Type toggle */}
                          <div className="flex border border-border overflow-hidden bg-background shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateDiscount(item.variant_id, item.discount_val, 'percentage')}
                              className={`h-9 w-9 text-xs font-mono font-bold transition-colors cursor-pointer ${
                                item.discount_type === 'percentage' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              %
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateDiscount(item.variant_id, item.discount_val, 'fixed')}
                              className={`h-9 w-9 text-xs font-mono font-bold transition-colors border-l border-border cursor-pointer ${
                                item.discount_type === 'fixed' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              C$
                            </button>
                          </div>
                          {/* Value */}
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            className="h-9 flex-1 text-sm px-2.5 rounded-none font-mono bg-background border-border text-right"
                            value={item.discount_val || ''}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0)
                              handleUpdateDiscount(item.variant_id, val, item.discount_type)
                            }}
                          />
                        </div>

                        {/* Loss warning */}
                        {isLoss && (
                          <div className="p-2 bg-destructive/15 border border-destructive/20 text-destructive text-xs leading-snug space-y-1.5 mt-1">
                            <div className="flex items-start gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span>Precio final ({formatCurrency(effectiveUnitPrice)}) &lt; Costo ({formatCurrency(item.cost)}).</span>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-foreground text-[11px]">
                              <input
                                type="checkbox"
                                checked={item.confirmedLoss}
                                onChange={(e) => handleConfirmLoss(item.variant_id, e.target.checked)}
                                className="h-3.5 w-3.5 accent-primary cursor-pointer"
                              />
                              <span>Confirmar venta con pérdida</span>
                            </label>
                          </div>
                        )}
                      </div>

                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer — Totals + Collapsible Options + Payment + Checkout */}
          <div className="border-t border-border bg-background/50 p-3.5 flex flex-col gap-2.5 shrink-0">
            {/* Collapsible Accordion for Optional Fields (Customer & Delivery) */}
            <div className="border border-border/80 bg-background rounded-none overflow-hidden">
              <button
                type="button"
                onClick={() => setIsOptionsOpen(prev => !prev)}
                className="w-full px-3 py-2 flex items-center justify-between bg-muted/30 hover:bg-muted/60 transition-colors text-xs font-mono font-bold text-foreground cursor-pointer select-none"
              >
                <span className="flex items-center gap-1.5 truncate mr-2">
                  <span>OPCIONES ADICIONALES</span>
                  {(customerName.trim() || deliveryAmount > 0) && (
                    <span className="text-[10px] font-normal text-primary bg-primary/10 px-1.5 py-0.5 rounded truncate">
                      {[
                        customerName.trim() ? `Cliente: ${customerName.trim()}` : null,
                        deliveryAmount > 0 ? `Delivery: C$${deliveryAmount}` : null
                      ].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
                {isOptionsOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {isOptionsOpen && (
                <div className="p-3 border-t border-border/60 flex flex-col gap-2.5 bg-background">
                  {/* Customer name input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                      Nombre del Cliente (opcional)
                    </label>
                    <Input
                      type="text"
                      placeholder="Cliente Estándar"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-8 text-xs bg-background border-border font-sans"
                    />
                  </div>

                  {/* Delivery input */}
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground shrink-0">
                      Delivery (C$)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={deliveryAmount || ''}
                      onChange={(e) => setDeliveryAmount(Math.max(0, Number(e.target.value) || 0))}
                      className="h-8 text-xs text-right bg-background border-border font-mono flex-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>SUBTOTAL</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {cart.some(i => i.discount_amount > 0) && (
                <div className="flex justify-between text-destructive font-bold">
                  <span>DESCUENTOS</span>
                  <span>−{formatCurrency(cart.reduce((s, i) => s + i.discount_amount, 0))}</span>
                </div>
              )}
              {deliveryAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>DELIVERY</span>
                  <span>+{formatCurrency(deliveryAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-display font-black text-xl pt-1.5 border-t border-border">
                <span>TOTAL</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                className="w-full h-10 text-xs font-display font-bold uppercase cursor-pointer"
                onClick={() => setPaymentMethod('cash')}
                style={paymentMethod === 'cash' ? { color: 'hsl(var(--primary-foreground))' } : {}}
              >
                <Banknote className="mr-1.5 h-3.5 w-3.5" /> EFECTIVO
              </Button>
              <Button
                type="button"
                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                className="w-full h-10 text-xs font-display font-bold uppercase cursor-pointer"
                onClick={() => setPaymentMethod('card')}
                style={paymentMethod === 'card' ? { color: 'hsl(var(--primary-foreground))' } : {}}
              >
                <CreditCard className="mr-1.5 h-3.5 w-3.5" /> TARJETA
              </Button>
            </div>

            {/* Checkout */}
            <Button
              className="w-full h-11 text-sm font-display font-black uppercase tracking-widest shadow-lg shadow-primary/20 cursor-pointer"
              disabled={cart.length === 0 || isProcessing || hasUnconfirmedLoss}
              onClick={handleCheckout}
              style={{ color: 'hsl(var(--primary-foreground))' }}
            >
              {isProcessing ? 'PROCESANDO...' : `COBRAR · ${formatCurrency(total)}`}
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
