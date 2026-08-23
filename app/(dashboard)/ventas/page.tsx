import { PosTerminal } from '@/components/features/pos/pos-terminal'
import { createClient } from '@/lib/supabase/server'
import { AlertTriangle, CreditCard, Lock } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

export default async function VentasPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Look for an OPEN cash register. Prefer one assigned to this user, fall back to any open one.
  const { data: registers } = await (supabase as any)
    .from('cash_registers')
    .select('id, name, status, opened_by')
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(5)

  const openRegisters = (registers as any[]) || []

  // Prefer the register opened by the current user
  const myRegister = openRegisters.find((r: any) => r.opened_by === user.id)
  const activeRegister = myRegister || openRegisters[0]

  if (!activeRegister) {
    return (
      <div className="max-w-xl mx-auto mt-20 space-y-4">
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle className="font-display font-black uppercase">Caja Sin Apertura</AlertTitle>
          <AlertDescription>
            No hay ninguna caja registradora abierta. Debes abrir una caja antes de poder procesar ventas.
          </AlertDescription>
        </Alert>
        <div className="flex gap-3">
          <Link href="/caja" className={buttonVariants({ variant: "default" })} style={{ color: 'hsl(var(--primary-foreground))' }}>
            <CreditCard className="mr-2 h-4 w-4" />
            IR A CONTROL DE CAJA
          </Link>
        </div>
      </div>
    )
  }

  // Load all active product variants with their product info for the POS (limited to 250 for speed)
  const { data: variantRows } = await (supabase as any)
    .from('product_variants')
    .select(`
      id,
      sku,
      size,
      color,
      quality,
      price_override,
      stock_quantity,
      product:products(
        id,
        name,
        sku,
        base_price,
        status,
        brand:brands(name, logo_url),
        category:categories(name, description),
        product_images(url, is_primary, sort_order)
      )
    `)
    .eq('is_active', true)
    .gt('stock_quantity', 0)
    .order('sku', { ascending: true })
    .limit(250)

  const variants = (variantRows as any[]) || []

  // Filter only active products
  const activeVariants = variants.filter((v: any) => v.product?.status === 'active')

  return (
    <div className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight uppercase">Punto de Venta</h1>
          <p className="text-muted-foreground font-mono text-xs">
            Caja activa: <strong className="text-primary">{activeRegister.name}</strong>
          </p>
        </div>
      </div>
      <PosTerminal registerId={activeRegister.id} registerName={activeRegister.name} variants={activeVariants} />
    </div>
  )
}
