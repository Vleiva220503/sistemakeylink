'use client'

import { useState, useMemo } from 'react'
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Receipt, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  talla: string | null   // categoría padre (Talla clasificación)
  tallaDescription: string | null // descripción de la talla
  price: number          // effective price: price_override ?? base_price
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

export function PosTerminal({ registerId, registerName, variants }: PosTerminalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')

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
  const total = subtotal // No tax hardcoded — real stores set tax separately

  // Margin check: if unit price after discount is less than cost, they are selling with a loss.
  const hasUnconfirmedLoss = useMemo(() => {
    return cart.some(item => {
      const effectiveUnitPrice = item.price - (item.discount_amount / item.quantity)
      const isLoss = effectiveUnitPrice < item.cost
      return isLoss && !item.confirmedLoss
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
      const price = item.price
      const qty = item.quantity
      let amount = 0
      if (type === 'percentage') {
        amount = Math.min(price * qty, Number(((val / 100) * price * qty).toFixed(2)))
      } else {
        amount = Math.min(price * qty, val)
      }
      return {
        ...item,
        discount_val: val,
        discount_type: type,
        discount_amount: amount
      }
    }))
  }

  const handleConfirmLoss = (variantId: string, confirmed: boolean) => {
    setCart(prev => prev.map(item => 
      item.variant_id === variantId ? { ...item, confirmedLoss: confirmed } : item
    ))
  }

  const updateQuantity = (variantId: string, delta: number) => {
    setCart(prev => prev
      .map(item => {
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
      })
    )
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

    // Snapshot cart before clearing it
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
        payments: [{
          amount: totalSnapshot,
          method: paymentMethod === 'cash' ? 'cash' : 'card',
          reference: null
        }],
        discount_amount: 0,
        discount_type: null,
        notes: null
      })

      if (result.error) {
        toast.error(`Error: ${result.error}`)
      } else {
        toast.success('¡Venta procesada! Generando factura PDF...', { duration: 3000 })
        setCart([])
        setSearchQuery('')

        // Auto-generate and download the A4 invoice PDF
        try {
          const { generateInvoicePDF } = await import('@/lib/generate-invoice-pdf')
          const invoiceData: InvoiceData = {
            saleNumber: result.saleNumber ?? result.saleId ?? 'N/A',
            date: new Date(),
            registerName,
            cashierName: 'Cajero',  // No user name available in client; can be enhanced later
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
          }
          await generateInvoicePDF(invoiceData)
        } catch (pdfErr) {
          console.error('Error al generar PDF de factura:', pdfErr)
          toast.error('Venta guardada, pero falló la generación del PDF.')
        }
      }
    } catch (error: any) {
      toast.error('Error inesperado al procesar la venta')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-160px)]">
      
      {/* Left: Product Catalog */}
      <Card className="lg:col-span-2 flex flex-col h-full border-border bg-card">
        <CardHeader className="pb-3 border-b border-border bg-background/50">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, talla, color, SKU o marca..."
              className="pl-11 h-12 text-sm font-sans bg-background border-border focus-visible:border-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="text-xs font-mono text-muted-foreground mt-1">
            {filteredVariants.length} pares disponibles{searchQuery ? ` (filtrado de ${variants.length})` : ''}
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-4 overflow-hidden">
          <ScrollArea className="h-full pr-2">
            {filteredVariants.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16 font-mono text-xs">
                No se encontraron variantes disponibles
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredVariants.map(variant => {
                  const price = getEffectivePrice(variant)
                  const inCart = cart.find(c => c.variant_id === variant.id)
                  // Cascading image: product_images → brand.logo_url → SafeImage fallback
                  const img = resolveProductImage(variant.product)

                  return (
                    <div
                      key={variant.id}
                      className={`sneaker-card border rounded-none p-3 flex flex-col gap-2 bg-background ${inCart ? 'border-primary' : 'border-border'}`}
                    >
                      {/* Image */}
                      <div className="aspect-square w-full overflow-hidden bg-secondary/20 flex items-center justify-center">
                        <SafeImage
                          src={img}
                          alt={variant.product?.name}
                          className="floating-sneaker-img object-contain w-full h-full"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold text-primary uppercase tracking-widest">
                          <span className="truncate mr-1">{variant.sku}</span>
                          {variant.product?.category?.name && (
                            <span 
                              className="text-muted-foreground font-semibold shrink-0 cursor-help"
                              title={variant.product.category.description || undefined}
                            >
                              T: {variant.product.category.name}{variant.product.category.description ? ` (${variant.product.category.description})` : ''}
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-bold text-xs uppercase leading-tight text-foreground line-clamp-2">
                          {variant.product?.name}
                        </h3>
                        {(variant.size || variant.color) && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {variant.size && (
                              <span className="size-btn px-2 py-0.5 text-[10px]">US {variant.size}</span>
                            )}
                            {variant.color && (
                              <span className="text-[10px] font-mono text-muted-foreground">{variant.color}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/40 mt-auto">
                        <div className="flex flex-col">
                          <span className="font-display font-black text-sm text-primary">{formatCurrency(price)}</span>
                          <span className="text-[9px] font-mono text-muted-foreground">
                            {variant.stock_quantity} pares
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-none border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent cursor-pointer shrink-0"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            addToCart(variant)
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {inCart && (
                        <div className="text-[10px] font-mono font-bold text-primary bg-primary/10 text-center py-0.5 mt-1">
                          EN CARRITO: {inCart.quantity}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right: Cart & Checkout */}
      <Card className="flex flex-col h-full border-border bg-card">
        <CardHeader className="pb-3 border-b border-border bg-background/50">
          <CardTitle className="flex items-center justify-between text-base font-display font-black uppercase">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <span>CARRITO</span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-primary text-primary-foreground">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} PARES
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center font-mono">
              <ShoppingCart className="h-10 w-10 opacity-20 mb-3" />
              <p className="text-xs font-display font-bold uppercase tracking-wider">CARRITO VACÍO</p>
              <p className="text-[11px] text-muted-foreground mt-1">Selecciona los pares del catálogo</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="divide-y divide-border">
                {cart.map(item => {
                  const effectiveUnitPrice = item.price - (item.discount_amount / item.quantity)
                  const isLoss = effectiveUnitPrice < item.cost

                  return (
                    <div key={item.variant_id} className="p-3.5 flex flex-col gap-2 hover:bg-background/80 transition-colors">
                      <div className="flex gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-display font-bold text-xs uppercase text-foreground truncate">{item.name}</h4>
                          <div className="text-[10px] font-mono text-muted-foreground">{item.sku}</div>
                          <div className="font-display font-black text-sm text-primary mt-1">
                            {formatCurrency(item.price)} c/u
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-between gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:bg-destructive/10 cursor-pointer"
                            onClick={() => removeFromCart(item.variant_id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>

                          <div className="flex items-center gap-1 border border-border bg-background">
                            <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer" onClick={() => updateQuantity(item.variant_id, -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center font-mono text-xs font-bold">{item.quantity}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer" onClick={() => updateQuantity(item.variant_id, 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Discount Controls */}
                      <div className="flex flex-col gap-1.5 p-2 bg-secondary/10 border border-border/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-muted-foreground">DESCUENTO:</span>
                          <div className="flex items-center gap-1.5">
                            <div className="flex border border-border h-6 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleUpdateDiscount(item.variant_id, item.discount_val, 'percentage')}
                                className={`px-2 text-[10px] font-mono font-bold ${item.discount_type === 'percentage' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                              >
                                %
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateDiscount(item.variant_id, item.discount_val, 'fixed')}
                                className={`px-2 text-[10px] font-mono font-bold ${item.discount_type === 'fixed' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                              >
                                C$
                              </button>
                            </div>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              className="h-6 w-20 text-xs px-2 rounded-none font-mono"
                              value={item.discount_val || ''}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value) || 0)
                                handleUpdateDiscount(item.variant_id, val, item.discount_type)
                              }}
                            />
                          </div>
                        </div>

                        {item.discount_amount > 0 && (
                          <div className="flex justify-between text-[10px] font-mono text-muted-foreground border-t border-border/40 pt-1">
                            <span>TOTAL DESCUENTO:</span>
                            <span className="text-destructive font-bold">-{formatCurrency(item.discount_amount)}</span>
                          </div>
                        )}

                        {/* Margin warning & loss confirmation */}
                        {isLoss && (
                          <div className="mt-1 p-2 bg-destructive/15 border border-destructive/20 text-destructive text-[10px] leading-tight space-y-1.5">
                            <div className="flex items-start gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-destructive" />
                              <span>
                                El descuento aplicado deja el precio de venta ({formatCurrency(effectiveUnitPrice)}) por debajo de su costo de compra ({formatCurrency(item.cost)}).
                              </span>
                            </div>
                            <label className="flex items-center gap-1.5 cursor-pointer font-bold select-none text-foreground pt-1">
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
            </ScrollArea>
          )}
        </CardContent>

        <CardFooter className="flex-col p-4 border-t border-border bg-background/50 gap-4">
          <div className="w-full space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>SUBTOTAL</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between font-display font-black text-xl pt-2 border-t border-border text-foreground">
              <span>TOTAL</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={paymentMethod === 'cash' ? 'default' : 'outline'}
              className="w-full text-xs font-display font-bold uppercase cursor-pointer"
              onClick={() => setPaymentMethod('cash')}
              style={paymentMethod === 'cash' ? { color: 'hsl(var(--primary-foreground))' } : {}}
            >
              <Banknote className="mr-1.5 h-4 w-4" /> EFECTIVO
            </Button>
            <Button
              type="button"
              variant={paymentMethod === 'card' ? 'default' : 'outline'}
              className="w-full text-xs font-display font-bold uppercase cursor-pointer"
              onClick={() => setPaymentMethod('card')}
              style={paymentMethod === 'card' ? { color: 'hsl(var(--primary-foreground))' } : {}}
            >
              <CreditCard className="mr-1.5 h-4 w-4" /> TARJETA
            </Button>
          </div>

          <Button
            className="w-full h-12 text-base font-display font-black uppercase tracking-widest shadow-lg shadow-primary/20 cursor-pointer"
            disabled={cart.length === 0 || isProcessing || hasUnconfirmedLoss}
            onClick={handleCheckout}
            style={{ color: 'hsl(var(--primary-foreground))' }}
          >
            {isProcessing ? 'PROCESANDO...' : `COBRAR · ${formatCurrency(total)}`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
