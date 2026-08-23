// ============================================================
// KEYLING — TypeScript Types matching the Supabase schema
// Auto-maintained: update when schema changes
// ============================================================

export type UserRole = 'admin' | 'cajero'
export type ProductStatus = 'active' | 'inactive' | 'discontinued'
export type InventoryMovementType =
  | 'purchase'
  | 'sale'
  | 'return'
  | 'supplier_return'
  | 'damage'
  | 'loss'
  | 'adjustment'
  | 'correction'
  | 'initial'
  | 'transfer'
export type PurchaseStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled'
export type SaleStatus = 'pending' | 'completed' | 'cancelled' | 'refunded' | 'partial_refund'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mobile_payment' | 'other'
export type ReturnType = 'return' | 'exchange'
export type ReturnStatus = 'pending' | 'completed' | 'cancelled'
export type RegisterStatus = 'closed' | 'open'
export type CashMovementType = 'sale' | 'expense' | 'income' | 'adjustment'
export type DiscountType = 'percentage' | 'fixed'

// ============================================================
// Database types for Supabase client
// ============================================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      categories: {
        Row: Category
        Insert: CategoryInsert
        Update: CategoryUpdate
      }
      brands: {
        Row: Brand
        Insert: BrandInsert
        Update: BrandUpdate
      }
      products: {
        Row: Product
        Insert: ProductInsert
        Update: ProductUpdate
      }
      product_variants: {
        Row: ProductVariant
        Insert: ProductVariantInsert
        Update: ProductVariantUpdate
      }
      product_images: {
        Row: ProductImage
        Insert: ProductImageInsert
        Update: ProductImageUpdate
      }
      suppliers: {
        Row: Supplier
        Insert: SupplierInsert
        Update: SupplierUpdate
      }
      customers: {
        Row: Customer
        Insert: CustomerInsert
        Update: CustomerUpdate
      }
      sales: {
        Row: Sale
        Insert: SaleInsert
        Update: SaleUpdate
      }
      sale_items: {
        Row: SaleItem
        Insert: SaleItemInsert
        Update: SaleItemUpdate
      }
      payments: {
        Row: Payment
        Insert: PaymentInsert
        Update: never
      }
      returns: {
        Row: Return
        Insert: ReturnInsert
        Update: ReturnUpdate
      }
      return_items: {
        Row: ReturnItem
        Insert: ReturnItemInsert
        Update: never
      }
      purchases: {
        Row: Purchase
        Insert: PurchaseInsert
        Update: PurchaseUpdate
      }
      purchase_items: {
        Row: PurchaseItem
        Insert: PurchaseItemInsert
        Update: PurchaseItemUpdate
      }
      purchase_receipts: {
        Row: PurchaseReceipt
        Insert: PurchaseReceiptInsert
        Update: never
      }
      purchase_receipt_items: {
        Row: PurchaseReceiptItem
        Insert: PurchaseReceiptItemInsert
        Update: never
      }
      inventory_movements: {
        Row: InventoryMovement
        Insert: InventoryMovementInsert
        Update: never
      }
      cost_history: {
        Row: CostHistory
        Insert: CostHistoryInsert
        Update: never
      }
      cash_registers: {
        Row: CashRegister
        Insert: CashRegisterInsert
        Update: CashRegisterUpdate
      }
      cash_movements: {
        Row: CashMovement
        Insert: CashMovementInsert
        Update: never
      }
      expense_categories: {
        Row: ExpenseCategory
        Insert: ExpenseCategoryInsert
        Update: ExpenseCategoryUpdate
      }
      expenses: {
        Row: Expense
        Insert: ExpenseInsert
        Update: ExpenseUpdate
      }
      audit_log: {
        Row: AuditLog
        Insert: AuditLogInsert
        Update: never
      }
    }
    Functions: {
      create_sale: {
        Args: {
          p_register_id: string
          p_created_by: string
          p_customer_id?: string | null
          p_items: SaleItemInput[]
          p_payments: PaymentInput[]
          p_discount_amount?: number
          p_discount_type?: DiscountType | null
          p_notes?: string | null
        }
        Returns: string
      }
      receive_purchase: {
        Args: {
          p_purchase_id: string
          p_received_by: string
          p_items: ReceiptItemInput[]
          p_notes?: string | null
        }
        Returns: string
      }
      adjust_inventory: {
        Args: {
          p_variant_id: string
          p_new_quantity: number
          p_reason: string
          p_created_by: string
        }
        Returns: void
      }
      process_return: {
        Args: {
          p_original_sale_id: string
          p_type: ReturnType
          p_reason: string
          p_items: ReturnItemInput[]
          p_created_by: string
          p_notes?: string | null
        }
        Returns: string
      }
      get_dashboard_summary: {
        Args: Record<string, never>
        Returns: DashboardSummary
      }
      get_profitability: {
        Args: { p_start_date: string; p_end_date: string }
        Returns: ProfitabilityData
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      auth_user_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
    }
    Views: {
      product_variants_public: {
        Row: ProductVariantPublic
      }
      sale_items_public: {
        Row: SaleItemPublic
      }
    }
    Enums: {
      user_role: UserRole
      product_status: ProductStatus
      inventory_movement_type: InventoryMovementType
      purchase_status: PurchaseStatus
      sale_status: SaleStatus
      payment_method: PaymentMethod
      return_type: ReturnType
      return_status: ReturnStatus
      register_status: RegisterStatus
      cash_movement_type: CashMovementType
      discount_type: DiscountType
    }
  }
}

// ============================================================
// Entity Types
// ============================================================

export interface Profile {
  id: string
  username: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
}
export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}
export type CategoryInsert = Omit<Category, 'id' | 'created_at' | 'updated_at'>
export type CategoryUpdate = Partial<Omit<Category, 'id' | 'created_at'>>

export interface Brand {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
export type BrandInsert = Omit<Brand, 'id' | 'created_at' | 'updated_at'>
export type BrandUpdate = Partial<Omit<Brand, 'id' | 'created_at'>>

export interface Product {
  id: string
  sku: string
  barcode: string | null
  name: string
  description: string | null
  category_id: string | null
  brand_id: string | null
  base_price: number
  status: ProductStatus
  has_variants: boolean
  created_at: string
  updated_at: string
}
export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'>
export type ProductUpdate = Partial<Omit<Product, 'id' | 'created_at'>>

export interface ProductVariant {
  id: string
  product_id: string
  sku: string
  size: string | null
  color: string | null
  quality: string | null
  additional_attrs: Record<string, string>
  price_override: number | null
  cost: number
  stock_quantity: number
  stock_reserved: number
  stock_min: number
  stock_max: number | null
  stock_reorder_point: number
  is_active: boolean
  version: number
  created_at: string
  updated_at: string
}
export type ProductVariantInsert = Omit<ProductVariant, 'id' | 'created_at' | 'updated_at' | 'version'>
export type ProductVariantUpdate = Partial<Omit<ProductVariant, 'id' | 'created_at'>>

// Public view (no cost column)
export type ProductVariantPublic = Omit<ProductVariant, 'cost'>

export interface ProductImage {
  id: string
  product_id: string
  url: string
  alt_text: string | null
  is_primary: boolean
  sort_order: number
  created_at: string
}
export type ProductImageInsert = Omit<ProductImage, 'id' | 'created_at'>
export type ProductImageUpdate = Partial<Omit<ProductImage, 'id' | 'created_at'>>

export interface Supplier {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
export type SupplierInsert = Omit<Supplier, 'id' | 'created_at' | 'updated_at'>
export type SupplierUpdate = Partial<Omit<Supplier, 'id' | 'created_at'>>

export interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  credit_limit: number
  is_active: boolean
  created_at: string
  updated_at: string
}
export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at'>
export type CustomerUpdate = Partial<Omit<Customer, 'id' | 'created_at'>>

export interface Sale {
  id: string
  sale_number: string
  customer_id: string | null
  register_id: string
  status: SaleStatus
  subtotal: number
  discount_amount: number
  discount_type: DiscountType | null
  total: number
  amount_paid: number
  amount_pending: number
  notes: string | null
  created_by: string
  completed_at: string | null
  created_at: string
  updated_at: string
}
export type SaleInsert = Omit<Sale, 'id' | 'created_at' | 'updated_at'>
export type SaleUpdate = Partial<Omit<Sale, 'id' | 'created_at'>>

export interface SaleItem {
  id: string
  sale_id: string
  variant_id: string
  quantity: number
  unit_price: number
  unit_cost: number   // Hidden from cajeros via RLS view
  discount_amount: number
  discount_type: DiscountType | null
  total: number
  created_at: string
}
export type SaleItemInsert = Omit<SaleItem, 'id' | 'created_at'>
export type SaleItemUpdate = Partial<Omit<SaleItem, 'id' | 'created_at'>>

// Public view (no unit_cost)
export type SaleItemPublic = Omit<SaleItem, 'unit_cost'>

export interface Payment {
  id: string
  sale_id: string
  method: PaymentMethod
  amount: number
  reference: string | null
  paid_at: string
  created_by: string
  created_at: string
}
export type PaymentInsert = Omit<Payment, 'id' | 'created_at'>

export interface Return {
  id: string
  return_number: string
  original_sale_id: string
  type: ReturnType
  status: ReturnStatus
  reason: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}
export type ReturnInsert = Omit<Return, 'id' | 'created_at' | 'updated_at'>
export type ReturnUpdate = Partial<Omit<Return, 'id' | 'created_at'>>

export interface ReturnItem {
  id: string
  return_id: string
  sale_item_id: string
  variant_id: string
  exchange_variant_id: string | null
  quantity: number
  unit_price: number
  refund_amount: number
  created_at: string
}
export type ReturnItemInsert = Omit<ReturnItem, 'id' | 'created_at'>

export interface Purchase {
  id: string
  reference_number: string
  supplier_id: string | null
  status: PurchaseStatus
  order_date: string
  expected_date: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}
export type PurchaseInsert = Omit<Purchase, 'id' | 'created_at' | 'updated_at'>
export type PurchaseUpdate = Partial<Omit<Purchase, 'id' | 'created_at'>>

export interface PurchaseItem {
  id: string
  purchase_id: string
  variant_id: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  created_at: string
  updated_at: string
}
export type PurchaseItemInsert = Omit<PurchaseItem, 'id' | 'created_at' | 'updated_at'>
export type PurchaseItemUpdate = Partial<Omit<PurchaseItem, 'id' | 'created_at'>>

export interface PurchaseReceipt {
  id: string
  purchase_id: string
  received_at: string
  received_by: string
  notes: string | null
  created_at: string
}
export type PurchaseReceiptInsert = Omit<PurchaseReceipt, 'id' | 'created_at'>

export interface PurchaseReceiptItem {
  id: string
  receipt_id: string
  purchase_item_id: string
  variant_id: string
  quantity_received: number
  unit_cost: number
  created_at: string
}
export type PurchaseReceiptItemInsert = Omit<PurchaseReceiptItem, 'id' | 'created_at'>

export interface InventoryMovement {
  id: string
  variant_id: string
  type: InventoryMovementType
  quantity: number
  stock_before: number
  stock_after: number
  reference_id: string | null
  reference_type: string | null
  notes: string | null
  created_by: string
  created_at: string
}
export type InventoryMovementInsert = Omit<InventoryMovement, 'id' | 'created_at'>

export interface CostHistory {
  id: string
  variant_id: string
  purchase_item_id: string | null
  previous_cost: number
  new_cost: number
  previous_stock: number
  new_stock: number
  created_at: string
}
export type CostHistoryInsert = Omit<CostHistory, 'id' | 'created_at'>

export interface CashRegister {
  id: string
  name: string
  status: RegisterStatus
  opened_by: string | null
  opened_at: string | null
  initial_amount: number
  closed_by: string | null
  closed_at: string | null
  expected_cash: number | null
  counted_cash: number | null
  difference: number | null
  notes: string | null
  created_at: string
  updated_at: string
}
export type CashRegisterInsert = Omit<CashRegister, 'id' | 'created_at' | 'updated_at'>
export type CashRegisterUpdate = Partial<Omit<CashRegister, 'id' | 'created_at'>>

export interface CashMovement {
  id: string
  register_id: string
  type: CashMovementType
  amount: number
  description: string | null
  reference_id: string | null
  created_by: string
  created_at: string
}
export type CashMovementInsert = Omit<CashMovement, 'id' | 'created_at'>

export interface ExpenseCategory {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}
export type ExpenseCategoryInsert = Omit<ExpenseCategory, 'id' | 'created_at'>
export type ExpenseCategoryUpdate = Partial<Omit<ExpenseCategory, 'id' | 'created_at'>>

export interface Expense {
  id: string
  category_id: string | null
  register_id: string | null
  description: string
  amount: number
  expense_date: string
  receipt_url: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}
export type ExpenseInsert = Omit<Expense, 'id' | 'created_at' | 'updated_at'>
export type ExpenseUpdate = Partial<Omit<Expense, 'id' | 'created_at'>>

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}
export type AuditLogInsert = Omit<AuditLog, 'id' | 'created_at'>

// ============================================================
// RPC Input Types
// ============================================================

export interface SaleItemInput {
  variant_id: string
  quantity: number
  unit_price: number
  discount_amount?: number
  discount_type?: DiscountType | null
}

export interface PaymentInput {
  method: PaymentMethod
  amount: number
  reference?: string
}

export interface ReceiptItemInput {
  purchase_item_id: string
  variant_id: string
  quantity_received: number
  unit_cost: number
}

export interface ReturnItemInput {
  sale_item_id: string
  variant_id: string
  exchange_variant_id?: string | null
  quantity: number
  unit_price: number
  refund_amount?: number
}

// ============================================================
// Analytics/RPC Return Types
// ============================================================

export interface DashboardSummary {
  today_sales: number
  today_transactions: number
  month_sales: number
  month_cost: number
  month_expenses: number
  total_products: number
  low_stock_variants: number
  out_of_stock: number
  pending_purchases: number
}

export interface ProfitabilityData {
  gross_sales: number
  discounts: number
  net_sales: number
  cogs: number
  gross_profit: number
  expenses: number
  net_profit: number
  transactions: number
}

// ============================================================
// Extended types (with joins)
// ============================================================

export interface ProductWithDetails extends Product {
  categories?: Category | null
  brands?: Brand | null
  product_images?: ProductImage[]
  product_variants?: ProductVariant[]
}

export interface SaleWithDetails extends Sale {
  customers?: Customer | null
  cash_registers?: CashRegister | null
  profiles?: Profile | null
  sale_items?: SaleItemWithDetails[]
  payments?: Payment[]
}

export interface SaleItemWithDetails extends SaleItem {
  product_variants?: ProductVariant & {
    products?: Product | null
  }
}

export interface PurchaseWithDetails extends Purchase {
  suppliers?: Supplier | null
  profiles?: Profile | null
  purchase_items?: PurchaseItemWithDetails[]
}

export interface PurchaseItemWithDetails extends PurchaseItem {
  product_variants?: ProductVariant & {
    products?: Product | null
  }
}

// Cart types (client-side only)
export interface CartItem {
  variantId: string
  productId: string
  productName: string
  variantLabel: string
  unitPrice: number
  quantity: number
  discountAmount: number
  stockAvailable: number
  imageUrl?: string | null
}
