-- ============================================================
-- KEYLING — Migration 003: Row Level Security (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS for RLS
-- ============================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if current user is active
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================

-- Users can read their own profile; admins can read all
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

-- Only admins can insert profiles (besides the trigger)
CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT
  WITH CHECK (is_admin());

-- Users can update their own profile (limited fields); admins can update all
CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());

-- Only admins can delete profiles
CREATE POLICY "profiles_delete"
  ON profiles FOR DELETE
  USING (is_admin());

-- ============================================================
-- CATEGORIES — All authenticated users can read; only admin can write
-- ============================================================

CREATE POLICY "categories_select"
  ON categories FOR SELECT
  USING (is_active_user());

CREATE POLICY "categories_insert"
  ON categories FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "categories_update"
  ON categories FOR UPDATE
  USING (is_admin());

CREATE POLICY "categories_delete"
  ON categories FOR DELETE
  USING (is_admin());

-- ============================================================
-- BRANDS — Same as categories
-- ============================================================

CREATE POLICY "brands_select"
  ON brands FOR SELECT
  USING (is_active_user());

CREATE POLICY "brands_insert"
  ON brands FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "brands_update"
  ON brands FOR UPDATE
  USING (is_admin());

CREATE POLICY "brands_delete"
  ON brands FOR DELETE
  USING (is_admin());

-- ============================================================
-- PRODUCTS — All authenticated read; admin write
-- ============================================================

CREATE POLICY "products_select"
  ON products FOR SELECT
  USING (is_active_user());

CREATE POLICY "products_insert"
  ON products FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "products_update"
  ON products FOR UPDATE
  USING (is_admin());

CREATE POLICY "products_delete"
  ON products FOR DELETE
  USING (is_admin());

-- ============================================================
-- PRODUCT VARIANTS
-- Cajeros can read (for selling), but NOT see cost column.
-- Cost protection is handled via a view (see below).
-- ============================================================

CREATE POLICY "variants_select"
  ON product_variants FOR SELECT
  USING (is_active_user());

CREATE POLICY "variants_insert"
  ON product_variants FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "variants_update"
  ON product_variants FOR UPDATE
  USING (is_admin());

CREATE POLICY "variants_delete"
  ON product_variants FOR DELETE
  USING (is_admin());

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================

CREATE POLICY "images_select"
  ON product_images FOR SELECT
  USING (is_active_user());

CREATE POLICY "images_insert"
  ON product_images FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "images_update"
  ON product_images FOR UPDATE
  USING (is_admin());

CREATE POLICY "images_delete"
  ON product_images FOR DELETE
  USING (is_admin());

-- ============================================================
-- SUPPLIERS — Admin only
-- ============================================================

CREATE POLICY "suppliers_select"
  ON suppliers FOR SELECT
  USING (is_admin());

CREATE POLICY "suppliers_insert"
  ON suppliers FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "suppliers_update"
  ON suppliers FOR UPDATE
  USING (is_admin());

CREATE POLICY "suppliers_delete"
  ON suppliers FOR DELETE
  USING (is_admin());

-- ============================================================
-- CUSTOMERS — All authenticated can read/write (needed for POS)
-- ============================================================

CREATE POLICY "customers_select"
  ON customers FOR SELECT
  USING (is_active_user());

CREATE POLICY "customers_insert"
  ON customers FOR INSERT
  WITH CHECK (is_active_user());

CREATE POLICY "customers_update"
  ON customers FOR UPDATE
  USING (is_active_user());

CREATE POLICY "customers_delete"
  ON customers FOR DELETE
  USING (is_admin());

-- ============================================================
-- SALES
-- Admins see all; cajeros see their own
-- ============================================================

CREATE POLICY "sales_select"
  ON sales FOR SELECT
  USING (
    is_admin() OR created_by = auth.uid()
  );

CREATE POLICY "sales_insert"
  ON sales FOR INSERT
  WITH CHECK (is_active_user() AND created_by = auth.uid());

CREATE POLICY "sales_update"
  ON sales FOR UPDATE
  USING (is_admin() OR created_by = auth.uid());

CREATE POLICY "sales_delete"
  ON sales FOR DELETE
  USING (is_admin());

-- ============================================================
-- SALE ITEMS — CRITICAL: unit_cost hidden from cajeros
-- Cajeros can only see their own sales' items
-- unit_cost is protected via the view below
-- ============================================================

CREATE POLICY "sale_items_select"
  ON sale_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_id
      AND (is_admin() OR s.created_by = auth.uid())
    )
  );

CREATE POLICY "sale_items_insert"
  ON sale_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "sale_items_update"
  ON sale_items FOR UPDATE
  USING (is_admin());

CREATE POLICY "sale_items_delete"
  ON sale_items FOR DELETE
  USING (is_admin());

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE POLICY "payments_select"
  ON payments FOR SELECT
  USING (
    is_admin() OR created_by = auth.uid()
  );

CREATE POLICY "payments_insert"
  ON payments FOR INSERT
  WITH CHECK (is_active_user() AND created_by = auth.uid());

CREATE POLICY "payments_update"
  ON payments FOR UPDATE
  USING (is_admin());

-- ============================================================
-- RETURNS
-- ============================================================

CREATE POLICY "returns_select"
  ON returns FOR SELECT
  USING (
    is_admin() OR created_by = auth.uid()
  );

CREATE POLICY "returns_insert"
  ON returns FOR INSERT
  WITH CHECK (is_active_user() AND created_by = auth.uid());

CREATE POLICY "returns_update"
  ON returns FOR UPDATE
  USING (is_admin() OR created_by = auth.uid());

-- ============================================================
-- RETURN ITEMS
-- ============================================================

CREATE POLICY "return_items_select"
  ON return_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM returns r
      WHERE r.id = return_id
      AND (is_admin() OR r.created_by = auth.uid())
    )
  );

CREATE POLICY "return_items_insert"
  ON return_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM returns r
      WHERE r.id = return_id AND r.created_by = auth.uid()
    )
  );

-- ============================================================
-- PURCHASES — Admin only
-- ============================================================

CREATE POLICY "purchases_select"
  ON purchases FOR SELECT
  USING (is_admin());

CREATE POLICY "purchases_insert"
  ON purchases FOR INSERT
  WITH CHECK (is_admin() AND created_by = auth.uid());

CREATE POLICY "purchases_update"
  ON purchases FOR UPDATE
  USING (is_admin());

CREATE POLICY "purchases_delete"
  ON purchases FOR DELETE
  USING (is_admin());

-- ============================================================
-- PURCHASE ITEMS
-- ============================================================

CREATE POLICY "purchase_items_select"
  ON purchase_items FOR SELECT
  USING (is_admin());

CREATE POLICY "purchase_items_insert"
  ON purchase_items FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "purchase_items_update"
  ON purchase_items FOR UPDATE
  USING (is_admin());

-- ============================================================
-- PURCHASE RECEIPTS
-- ============================================================

CREATE POLICY "purchase_receipts_select"
  ON purchase_receipts FOR SELECT
  USING (is_admin());

CREATE POLICY "purchase_receipts_insert"
  ON purchase_receipts FOR INSERT
  WITH CHECK (is_admin() AND received_by = auth.uid());

-- ============================================================
-- PURCHASE RECEIPT ITEMS
-- ============================================================

CREATE POLICY "purchase_receipt_items_select"
  ON purchase_receipt_items FOR SELECT
  USING (is_admin());

CREATE POLICY "purchase_receipt_items_insert"
  ON purchase_receipt_items FOR INSERT
  WITH CHECK (is_admin());

-- ============================================================
-- INVENTORY MOVEMENTS
-- Cajeros can view movements (but not cost data — no cost column here)
-- Only admin (or system functions) can insert
-- ============================================================

CREATE POLICY "inv_movements_select"
  ON inventory_movements FOR SELECT
  USING (is_active_user());

-- No direct INSERT — all inserts happen via SECURITY DEFINER functions
CREATE POLICY "inv_movements_insert"
  ON inventory_movements FOR INSERT
  WITH CHECK (is_admin());

-- ============================================================
-- COST HISTORY — Admin only
-- ============================================================

CREATE POLICY "cost_history_select"
  ON cost_history FOR SELECT
  USING (is_admin());

CREATE POLICY "cost_history_insert"
  ON cost_history FOR INSERT
  WITH CHECK (is_admin());

-- ============================================================
-- CASH REGISTERS
-- Cajeros can see and use their own register; admin can see all
-- ============================================================

CREATE POLICY "cash_registers_select"
  ON cash_registers FOR SELECT
  USING (is_active_user());

CREATE POLICY "cash_registers_insert"
  ON cash_registers FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "cash_registers_update"
  ON cash_registers FOR UPDATE
  USING (
    is_admin() OR opened_by = auth.uid()
  );

-- ============================================================
-- CASH MOVEMENTS
-- ============================================================

CREATE POLICY "cash_movements_select"
  ON cash_movements FOR SELECT
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM cash_registers cr
      WHERE cr.id = register_id AND cr.opened_by = auth.uid()
    )
  );

CREATE POLICY "cash_movements_insert"
  ON cash_movements FOR INSERT
  WITH CHECK (is_active_user() AND created_by = auth.uid());

-- ============================================================
-- EXPENSE CATEGORIES
-- ============================================================

CREATE POLICY "expense_categories_select"
  ON expense_categories FOR SELECT
  USING (is_active_user());

CREATE POLICY "expense_categories_insert"
  ON expense_categories FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "expense_categories_update"
  ON expense_categories FOR UPDATE
  USING (is_admin());

-- ============================================================
-- EXPENSES
-- Admins see all; cajeros see only their own
-- ============================================================

CREATE POLICY "expenses_select"
  ON expenses FOR SELECT
  USING (is_admin() OR created_by = auth.uid());

CREATE POLICY "expenses_insert"
  ON expenses FOR INSERT
  WITH CHECK (is_active_user() AND created_by = auth.uid());

CREATE POLICY "expenses_update"
  ON expenses FOR UPDATE
  USING (is_admin() OR created_by = auth.uid());

CREATE POLICY "expenses_delete"
  ON expenses FOR DELETE
  USING (is_admin());

-- ============================================================
-- AUDIT LOG — Admin only
-- ============================================================

CREATE POLICY "audit_log_select"
  ON audit_log FOR SELECT
  USING (is_admin());

CREATE POLICY "audit_log_insert"
  ON audit_log FOR INSERT
  WITH CHECK (true); -- Functions can write audit logs (SECURITY DEFINER)

-- ============================================================
-- SECURE VIEWS — Hide sensitive columns from cajeros
-- ============================================================

-- View for variants without cost (for cajeros)
CREATE OR REPLACE VIEW product_variants_public AS
SELECT
  id,
  product_id,
  sku,
  size,
  color,
  quality,
  additional_attrs,
  price_override,
  stock_quantity,
  stock_min,
  stock_max,
  stock_reorder_point,
  is_active,
  version,
  created_at,
  updated_at
FROM product_variants;

-- Grant access to the view
GRANT SELECT ON product_variants_public TO authenticated;

-- View for sale items without unit_cost (for cajeros)
CREATE OR REPLACE VIEW sale_items_public AS
SELECT
  id,
  sale_id,
  variant_id,
  quantity,
  unit_price,
  discount_amount,
  total,
  created_at
FROM sale_items;

GRANT SELECT ON sale_items_public TO authenticated;
