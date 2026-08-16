'use client'

import { useState } from 'react'
import { Plus, Package, ArrowUpRight, History, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { addStockQuantity } from '@/app/actions/inventory'

interface AddStockModalProps {
  variantId: string
  productName: string
  sku: string
  currentStock: number
  color?: string | null
  size?: string | null
}

export function AddStockModal({
  variantId,
  productName,
  sku,
  currentStock,
  color,
  size
}: AddStockModalProps) {
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('Reposición de inventario')
  const [isLoading, setIsLoading] = useState(false)

  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault()
    const num = parseInt(quantity, 10)
    if (isNaN(num) || num <= 0) {
      toast.error('Ingresa una cantidad válida mayor a 0')
      return
    }

    setIsLoading(true)
    try {
      const res = await addStockQuantity({
        variant_id: variantId,
        quantity_to_add: num,
        reason
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Stock actualizado exitosamente a ${res.newStock} unidades`)
        setOpen(false)
        setQuantity('1')
      }
    } catch {
      toast.error('Error al actualizar el stock')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10">
            <Plus className="h-3 w-3" />
            Agregar Stock
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Entrada / Agregar Cantidad a Stock
          </DialogTitle>
          <DialogDescription>
            Registra el ingreso de mercancía recibida. Esta acción sumará la cantidad indicada al stock actual y creará un registro en el Kardex.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddStock} className="space-y-4 pt-2">
          {/* Resumen producto */}
          <div className="p-3 bg-muted rounded-lg border text-xs space-y-1">
            <p className="font-bold text-sm text-foreground">{productName}</p>
            <div className="flex gap-3 text-muted-foreground font-mono">
              <span>SKU: {sku}</span>
              {size && <span>Talla: {size}</span>}
              {color && <span>Color: {color}</span>}
            </div>
            <div className="pt-1 flex justify-between font-mono font-bold border-t mt-1">
              <span>Stock Actual:</span>
              <span className="text-primary">{currentStock} unidades</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider">CANTIDAD A SUMAR *</label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ej. 10"
              required
              className="font-mono text-base font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider">MOTIVO / NOTA</label>
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Compra a proveedor / Reposición de almacén"
            />
          </div>

          {/* Cálculo previsto */}
          <div className="p-2.5 bg-primary/10 border border-primary/20 rounded text-xs flex justify-between items-center font-mono">
            <span className="text-muted-foreground">Nuevo stock resultante:</span>
            <span className="font-black text-sm text-primary">
              {currentStock} + {parseInt(quantity || '0', 10)} = {currentStock + (parseInt(quantity || '0', 10) || 0)} unid.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} style={{ color: 'hsl(var(--primary-foreground))' }}>
              {isLoading ? 'Registrando...' : 'Confirmar Ingreso'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
