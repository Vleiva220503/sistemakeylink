'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createPurchase } from '@/app/actions/crud'

interface SelectedItem {
  variant_id: string
  sku: string
  name: string
  quantity_ordered: number
  unit_cost: number
}

export function PurchaseForm({ suppliers, variants }: { suppliers: any[]; variants: any[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // State for items added to the purchase order
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  
  // State for the item being currently edited in the dropdown form
  const [currentVariantId, setCurrentVariantId] = useState('')
  const [currentQty, setCurrentQty] = useState(1)
  const [currentCost, setCurrentCost] = useState(0)

  const today = new Date().toISOString().split('T')[0]

  const handleAddVariant = () => {
    if (!currentVariantId) {
      toast.error('Selecciona una variante')
      return
    }
    const variant = variants.find(v => v.id === currentVariantId)
    if (!variant) return

    // Check if variant already added
    if (selectedItems.some(i => i.variant_id === currentVariantId)) {
      toast.error('Esta variante ya ha sido agregada')
      return
    }

    const label = `${variant.product?.name} (US ${variant.size || ''} - ${variant.color || ''})`

    setSelectedItems(prev => [...prev, {
      variant_id: currentVariantId,
      sku: variant.sku,
      name: label,
      quantity_ordered: currentQty,
      unit_cost: currentCost > 0 ? currentCost : (variant.cost || 0)
    }])

    // Reset current item inputs
    setCurrentVariantId('')
    setCurrentQty(1)
    setCurrentCost(0)
  }

  const handleRemoveItem = (variantId: string) => {
    setSelectedItems(prev => prev.filter(item => item.variant_id !== variantId))
  }

  const handleVariantSelect = (id: string) => {
    setCurrentVariantId(id)
    const variant = variants.find(v => v.id === id)
    if (variant) {
      setCurrentCost(variant.cost || 0)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (selectedItems.length === 0) {
      toast.error('Agrega al menos una variante a la orden de compra')
      return
    }

    const fd = new FormData(e.currentTarget)
    fd.append('items', JSON.stringify(selectedItems))

    startTransition(async () => {
      const result = await createPurchase(fd)
      if (result.error) {
        toast.error('Error: ' + result.error)
      } else {
        toast.success('Orden de compra creada exitosamente')
        setOpen(false)
        setSelectedItems([])
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button style={{ color: 'hsl(var(--primary-foreground))' }}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Orden de Compra
          </Button>
        }
      />
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Orden de Compra</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium">Proveedor</label>
              <select name="supplier_id"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                <option value="">Sin proveedor</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha de Orden *</label>
              <Input name="order_date" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha Esperada</label>
              <Input name="expected_date" type="date" />
            </div>
          </div>

          <div className="border border-border p-3 space-y-3 bg-secondary/20">
            <h4 className="text-xs font-mono font-bold text-primary uppercase">Agregar Ítems a la Orden</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
              
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-mono text-muted-foreground">Variante / SKU</label>
                <select 
                  value={currentVariantId}
                  onChange={(e) => handleVariantSelect(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm"
                >
                  <option value="">Selecciona variante...</option>
                  {variants.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.sku} - {v.product?.name} ({v.size ? `US ${v.size}` : ''} {v.color || ''})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground">Cantidad</label>
                <Input 
                  type="number" 
                  min="1" 
                  value={currentQty} 
                  onChange={(e) => setCurrentQty(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1 flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-mono text-muted-foreground">Costo Unit.</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={currentCost} 
                    onChange={(e) => setCurrentCost(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={handleAddVariant} 
                  className="h-9 self-end"
                  style={{ color: 'hsl(var(--primary-foreground))' }}
                >
                  +
                </Button>
              </div>

            </div>

            {/* Selected items list */}
            {selectedItems.length > 0 && (
              <div className="mt-3 border-t border-border pt-2 space-y-1.5 max-h-40 overflow-y-auto">
                <div className="grid grid-cols-6 text-[10px] font-mono font-bold text-muted-foreground border-b border-border/40 pb-1">
                  <div className="col-span-3">SNEAKER VARIANT</div>
                  <div className="text-right">CANT.</div>
                  <div className="text-right">COSTO</div>
                  <div className="text-right">ACCIONES</div>
                </div>
                {selectedItems.map((item) => (
                  <div key={item.variant_id} className="grid grid-cols-6 text-xs items-center font-mono py-1 border-b border-border/20 last:border-b-0">
                    <div className="col-span-3 truncate font-sans font-semibold text-[11px]">{item.name}</div>
                    <div className="text-right">{item.quantity_ordered}</div>
                    <div className="text-right">${item.unit_cost.toFixed(2)}</div>
                    <div className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.variant_id)}
                        className="h-5 w-5 text-destructive hover:bg-destructive/10 ml-auto"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notas</label>
            <Input name="notes" placeholder="Observaciones..." />
          </div>

          <Button type="submit" className="w-full" disabled={isPending} style={{ color: 'hsl(var(--primary-foreground))' }}>
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando Orden...</> : 'Crear Orden de Compra'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
