import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SaleDetailClient } from './sale-detail-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VentaDetallePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user role
  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false
  let cashierName = 'Cajero'
  if (user) {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()
    isAdmin = (profile as any)?.role === 'admin'
    cashierName = (profile as any)?.full_name || 'Cajero'
  }

  // Fetch full sale with all related data
  const { data: sale, error } = await (supabase as any)
    .from('sales')
    .select(`
      id,
      sale_number,
      status,
      subtotal,
      discount_amount,
      discount_type,
      total,
      amount_paid,
      amount_pending,
      notes,
      created_at,
      completed_at,
      customer:customers(id, name, phone, email),
      register:cash_registers(id, name),
      cajero:profiles!sales_created_by_fkey(id, full_name),
      sale_items(
        id,
        quantity,
        unit_price,
        discount_amount,
        discount_type,
        total,
        variant:product_variants(
          id,
          sku,
          size,
          color,
          quality,
          product:products(
            id,
            name,
            sku,
            category:categories(name, description)
          )
        )
      ),
      payments(id, method, amount, reference)
    `)
    .eq('id', id)
    .single()

  if (error || !sale) {
    notFound()
  }

  return (
    <SaleDetailClient
      sale={sale as any}
      isAdmin={isAdmin}
      currentCashierName={cashierName}
    />
  )
}
