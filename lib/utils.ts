import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency in a consistent way
 */
export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `C$ ${formatted}`
}

/**
 * Format a date/time string
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(d)
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Generate a URL-friendly slug from a name
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * Calculate margin percentage
 */
export function calculateMargin(cost: number, price: number): number {
  if (price === 0) return 0
  return ((price - cost) / price) * 100
}

/**
 * Calculate markup percentage
 */
export function calculateMarkup(cost: number, price: number): number {
  if (cost === 0) return 0
  return ((price - cost) / cost) * 100
}

/**
 * Truncate text to a max length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…'
}

/**
 * Get stock status for display
 */
export function getStockStatus(stock: number, reorderPoint: number): {
  label: string
  variant: 'success' | 'warning' | 'danger'
} {
  if (stock === 0) return { label: 'Agotado', variant: 'danger' }
  if (stock <= reorderPoint) return { label: 'Stock bajo', variant: 'warning' }
  return { label: 'Disponible', variant: 'success' }
}

/**
 * Format a product variant label
 */
export function formatVariantLabel(variant: {
  size?: string | null
  color?: string | null
  quality?: string | null
}): string {
  const parts = [variant.color, variant.size, variant.quality].filter(Boolean)
  return parts.join(' / ') || 'Sin variante'
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

/**
 * Validate URL (for product images)
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Payment method labels
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mobile_payment: 'Pago móvil',
  other: 'Otro',
}

/**
 * Sale status labels
 */
export const SALE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completada',
  cancelled: 'Cancelada',
  refunded: 'Devuelta',
  partial_refund: 'Devolución parcial',
}

/**
 * Purchase status labels
 */
export const PURCHASE_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  ordered: 'Pedido',
  partial: 'Recibido parcial',
  received: 'Recibido',
  cancelled: 'Cancelado',
}
