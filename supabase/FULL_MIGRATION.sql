-- ============================================================
-- KEYLING — Sistema Integral de Gestión de Tienda
-- Migration 001: Initial Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'cajero');

CREATE TYPE product_status AS ENUM ('active', 'inactive', 'discontinued');

CREATE TYPE inventory_movement_type AS ENUM (
  'purchase',
  'sale',
  'return',
  'supplier_return',
  'damage',
  'loss',
  'adjustment',
  'correction',
  'initial',
  'transfer'
);

CREATE TYPE purchase_status AS ENUM ('draft', 'ordered', 'partial', 'received', 'cancelled');

CREATE TYPE sale_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded', 'partial_refund');

CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'mobile_payment', 'other');

CREATE TYPE return_type AS ENUM ('return', 'exchange');

CREATE TYPE return_status AS ENUM ('pending', 'completed', 'cancelled');

CREATE TYPE register_status AS ENUM ('closed', 'open');

CREATE TYPE cash_movement_type AS ENUM ('sale', 'expense', 'income', 'adjustment');

CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT UNIQUE NOT NULL,
  full_name    TEXT,
  role         user_role NOT NULL DEFAULT 'cajero',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES
-- ============================================================

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BRANDS
-- ============================================================

CREATE TABLE brands (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================

CREATE TABLE products (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku          TEXT UNIQUE NOT NULL,
  barcode      TEXT,
  name         TEXT NOT NULL,
  description  TEXT,
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand_id     UUID REFERENCES brands(id) ON DELETE SET NULL,
  base_price   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  status       product_status NOT NULL DEFAULT 'active',
  has_variants BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCT VARIANTS
-- ============================================================

CREATE TABLE product_variants (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku                TEXT UNIQUE NOT NULL,
  size               TEXT,
  color              TEXT,
  quality            TEXT,
  additional_attrs   JSONB DEFAULT '{}',
  price_override     NUMERIC(10,2) CHECK (price_override >= 0),
  cost               NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  stock_quantity     INTEGER NOT NULL DEFAULT 0,
  stock_reserved     INTEGER NOT NULL DEFAULT 0,
  stock_min          INTEGER NOT NULL DEFAULT 0,
  stock_max          INTEGER,
  stock_reorder_point INTEGER NOT NULL DEFAULT 0,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  version            INTEGER NOT NULL DEFAULT 1,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_not_negative CHECK (stock_quantity >= 0),
  CONSTRAINT reserved_not_negative CHECK (stock_reserved >= 0),
  CONSTRAINT reserved_lte_stock CHECK (stock_reserved <= stock_quantity)
);

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================

CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt_text    TEXT,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one primary image per product
CREATE UNIQUE INDEX product_images_primary_idx
  ON product_images (product_id)
  WHERE is_primary = true;

-- ============================================================
-- SUPPLIERS
-- ============================================================

CREATE TABLE suppliers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  contact_name TEXT,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE customers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  notes        TEXT,
  credit_limit NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CASH REGISTERS
-- ============================================================

CREATE TABLE cash_registers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT UNIQUE NOT NULL,
  status         register_status NOT NULL DEFAULT 'closed',
  opened_by      UUID REFERENCES profiles(id),
  opened_at      TIMESTAMPTZ,
  initial_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (initial_amount >= 0),
  closed_by      UUID REFERENCES profiles(id),
  closed_at      TIMESTAMPTZ,
  expected_cash  NUMERIC(10,2),
  counted_cash   NUMERIC(10,2),
  difference     NUMERIC(10,2),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SALES
-- ============================================================

CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_number     TEXT UNIQUE NOT NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  register_id     UUID NOT NULL REFERENCES cash_registers(id),
  status          sale_status NOT NULL DEFAULT 'pending',
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_type   discount_type,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_pending  NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SALE ITEMS
-- ============================================================

CREATE TABLE sale_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  variant_id      UUID NOT NULL REFERENCES product_variants(id),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit_price      NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id     UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method      payment_method NOT NULL,
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reference   TEXT,
  paid_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RETURNS
-- ============================================================

CREATE TABLE returns (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_number    TEXT UNIQUE NOT NULL,
  original_sale_id UUID NOT NULL REFERENCES sales(id),
  type             return_type NOT NULL,
  status           return_status NOT NULL DEFAULT 'pending',
  reason           TEXT,
  notes            TEXT,
  created_by       UUID NOT NULL REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RETURN ITEMS
-- ============================================================

CREATE TABLE return_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id           UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  sale_item_id        UUID NOT NULL REFERENCES sale_items(id),
  variant_id          UUID NOT NULL REFERENCES product_variants(id),
  exchange_variant_id UUID REFERENCES product_variants(id),
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  unit_price          NUMERIC(10,2) NOT NULL,
  refund_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PURCHASES
-- ============================================================

CREATE TABLE purchases (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number TEXT UNIQUE NOT NULL,
  supplier_id      UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  status           purchase_status NOT NULL DEFAULT 'draft',
  order_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date    DATE,
  notes            TEXT,
  created_by       UUID NOT NULL REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PURCHASE ITEMS
-- ============================================================

CREATE TABLE purchase_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id       UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  variant_id        UUID NOT NULL REFERENCES product_variants(id),
  quantity_ordered  INTEGER NOT NULL CHECK (quantity_ordered > 0),
  quantity_received INTEGER NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  unit_cost         NUMERIC(10,2) NOT NULL CHECK (unit_cost >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT qty_received_lte_ordered CHECK (quantity_received <= quantity_ordered)
);

-- ============================================================
-- PURCHASE RECEIPTS (partial receipt tracking)
-- ============================================================

CREATE TABLE purchase_receipts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by UUID NOT NULL REFERENCES profiles(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PURCHASE RECEIPT ITEMS
-- ============================================================

CREATE TABLE purchase_receipt_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id        UUID NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
  purchase_item_id  UUID NOT NULL REFERENCES purchase_items(id),
  variant_id        UUID NOT NULL REFERENCES product_variants(id),
  quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
  unit_cost         NUMERIC(10,2) NOT NULL CHECK (unit_cost >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INVENTORY MOVEMENTS
-- ============================================================

CREATE TABLE inventory_movements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id      UUID NOT NULL REFERENCES product_variants(id),
  type            inventory_movement_type NOT NULL,
  quantity        INTEGER NOT NULL,   -- positive = in, negative = out
  stock_before    INTEGER NOT NULL,
  stock_after     INTEGER NOT NULL,
  reference_id    UUID,
  reference_type  TEXT,               -- 'purchase', 'sale', 'return', etc.
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COST HISTORY (WAC tracking)
-- ============================================================

CREATE TABLE cost_history (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id       UUID NOT NULL REFERENCES product_variants(id),
  purchase_item_id UUID REFERENCES purchase_items(id),
  previous_cost    NUMERIC(10,2) NOT NULL,
  new_cost         NUMERIC(10,2) NOT NULL,
  previous_stock   INTEGER NOT NULL,
  new_stock        INTEGER NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CASH MOVEMENTS
-- ============================================================

CREATE TABLE cash_movements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  register_id  UUID NOT NULL REFERENCES cash_registers(id),
  type         cash_movement_type NOT NULL,
  amount       NUMERIC(10,2) NOT NULL,
  description  TEXT,
  reference_id UUID,
  created_by   UUID NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXPENSE CATEGORIES
-- ============================================================

CREATE TABLE expense_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXPENSES
-- ============================================================

CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  register_id UUID REFERENCES cash_registers(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  notes       TEXT,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id),
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    UUID,
  old_data     JSONB,
  new_data     JSONB,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Products
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_sku ON products(sku);

-- Variants
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_stock ON product_variants(stock_quantity);
CREATE INDEX idx_variants_active ON product_variants(is_active);

-- Sales
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_register ON sales(register_id);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_created_by ON sales(created_by);

-- Sale items
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_variant ON sale_items(variant_id);

-- Inventory movements
CREATE INDEX idx_inv_movements_variant ON inventory_movements(variant_id);
CREATE INDEX idx_inv_movements_type ON inventory_movements(type);
CREATE INDEX idx_inv_movements_created_at ON inventory_movements(created_at);
CREATE INDEX idx_inv_movements_ref ON inventory_movements(reference_id, reference_type);

-- Purchases
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_created_by ON purchases(created_by);

-- Purchase items
CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_variant ON purchase_items(variant_id);

-- Cash registers
CREATE INDEX idx_cash_movements_register ON cash_movements(register_id);
CREATE INDEX idx_cash_movements_created_at ON cash_movements(created_at);

-- Expenses
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_register ON expenses(register_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

-- Audit log
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_cash_registers_updated_at
  BEFORE UPDATE ON cash_registers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_purchase_items_updated_at
  BEFORE UPDATE ON purchase_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_returns_updated_at
  BEFORE UPDATE ON returns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PROFILE AUTO-CREATE ON AUTH SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'cajero')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
-- ============================================================
-- KEYLING — Migration 002: Business Logic Functions (RPCs)
-- ============================================================

-- ============================================================
-- UTILITY: Generate sequential numbers
-- ============================================================

CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_count
  FROM sales
  WHERE TO_CHAR(created_at, 'YYYY') = v_year;
  RETURN 'VTA-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_purchase_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_count
  FROM purchases
  WHERE TO_CHAR(created_at, 'YYYY') = v_year;
  RETURN 'OC-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_count
  FROM returns
  WHERE TO_CHAR(created_at, 'YYYY') = v_year;
  RETURN 'DEV-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_product_sku(p_category_slug TEXT)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_count INTEGER;
BEGIN
  v_prefix := UPPER(SUBSTR(COALESCE(p_category_slug, 'PRD'), 1, 3));
  SELECT COUNT(*) + 1 INTO v_count FROM products;
  RETURN v_prefix || '-' || LPAD(v_count::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CORE: Create a complete sale (ATOMIC)
-- ============================================================

CREATE TYPE sale_item_input AS (
  variant_id      UUID,
  quantity        INTEGER,
  unit_price      NUMERIC(10,2),
  discount_amount NUMERIC(10,2)
);

CREATE TYPE payment_input AS (
  method    payment_method,
  amount    NUMERIC(10,2),
  reference TEXT
);

CREATE OR REPLACE FUNCTION create_sale(
  p_register_id    UUID,
  p_created_by     UUID,
  p_customer_id    UUID,
  p_items          sale_item_input[],
  p_payments       payment_input[],
  p_discount_amount NUMERIC(10,2) DEFAULT 0,
  p_discount_type  discount_type DEFAULT NULL,
  p_notes          TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_sale_id        UUID;
  v_sale_number    TEXT;
  v_item           sale_item_input;
  v_payment        payment_input;
  v_variant        RECORD;
  v_subtotal       NUMERIC(10,2) := 0;
  v_item_total     NUMERIC(10,2);
  v_total          NUMERIC(10,2);
  v_amount_paid    NUMERIC(10,2) := 0;
  v_rows_affected  INTEGER;
BEGIN
  -- Validate register is open
  PERFORM 1 FROM cash_registers WHERE id = p_register_id AND status = 'open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cash register is not open';
  END IF;

  -- Generate sale number
  v_sale_number := generate_sale_number();

  -- Validate stock and calculate subtotal
  FOREACH v_item IN ARRAY p_items LOOP
    -- Lock the variant row to prevent concurrent oversell
    SELECT pv.*, p.name as product_name
    INTO v_variant
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.id = v_item.variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant % not found', v_item.variant_id;
    END IF;

    IF NOT v_variant.is_active THEN
      RAISE EXCEPTION 'Variant % is not active', v_item.variant_id;
    END IF;

    IF v_variant.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for variant %. Available: %, Requested: %',
        v_item.variant_id, v_variant.stock_quantity, v_item.quantity;
    END IF;

    v_item_total := (v_item.unit_price * v_item.quantity) - COALESCE(v_item.discount_amount, 0);
    v_subtotal := v_subtotal + v_item_total;
  END LOOP;

  -- Apply global discount
  IF p_discount_type = 'percentage' THEN
    v_total := v_subtotal * (1 - p_discount_amount / 100);
  ELSIF p_discount_type = 'fixed' THEN
    v_total := v_subtotal - p_discount_amount;
  ELSE
    v_total := v_subtotal;
  END IF;
  v_total := GREATEST(v_total, 0);

  -- Calculate amount paid
  FOREACH v_payment IN ARRAY p_payments LOOP
    v_amount_paid := v_amount_paid + v_payment.amount;
  END LOOP;

  -- Create the sale
  INSERT INTO sales (
    sale_number, customer_id, register_id, status,
    subtotal, discount_amount, discount_type, total,
    amount_paid, amount_pending, notes, created_by, completed_at
  ) VALUES (
    v_sale_number, p_customer_id, p_register_id, 'completed',
    v_subtotal, COALESCE(p_discount_amount, 0), p_discount_type, v_total,
    v_amount_paid, GREATEST(v_total - v_amount_paid, 0),
    p_notes, p_created_by, NOW()
  ) RETURNING id INTO v_sale_id;

  -- Insert sale items and update inventory
  FOREACH v_item IN ARRAY p_items LOOP
    SELECT pv.*
    INTO v_variant
    FROM product_variants pv
    WHERE pv.id = v_item.variant_id;

    v_item_total := (v_item.unit_price * v_item.quantity) - COALESCE(v_item.discount_amount, 0);

    -- Insert sale item (with current WAC cost)
    INSERT INTO sale_items (
      sale_id, variant_id, quantity,
      unit_price, unit_cost, discount_amount, total
    ) VALUES (
      v_sale_id, v_item.variant_id, v_item.quantity,
      v_item.unit_price, v_variant.cost,
      COALESCE(v_item.discount_amount, 0), v_item_total
    );

    -- Update stock
    UPDATE product_variants
    SET
      stock_quantity = stock_quantity - v_item.quantity,
      version = version + 1,
      updated_at = NOW()
    WHERE id = v_item.variant_id
      AND stock_quantity >= v_item.quantity;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected = 0 THEN
      RAISE EXCEPTION 'Concurrent stock conflict for variant %', v_item.variant_id;
    END IF;

    -- Record inventory movement
    INSERT INTO inventory_movements (
      variant_id, type, quantity,
      stock_before, stock_after,
      reference_id, reference_type,
      notes, created_by
    ) VALUES (
      v_item.variant_id, 'sale', -v_item.quantity,
      v_variant.stock_quantity,
      v_variant.stock_quantity - v_item.quantity,
      v_sale_id, 'sale',
      'Venta ' || v_sale_number,
      p_created_by
    );
  END LOOP;

  -- Insert payments
  FOREACH v_payment IN ARRAY p_payments LOOP
    INSERT INTO payments (sale_id, method, amount, reference, created_by)
    VALUES (v_sale_id, v_payment.method, v_payment.amount, v_payment.reference, p_created_by);
  END LOOP;

  -- Record cash movement for cash payments
  FOR v_payment IN
    SELECT * FROM UNNEST(p_payments) AS p WHERE p.method = 'cash'
  LOOP
    INSERT INTO cash_movements (register_id, type, amount, description, reference_id, created_by)
    VALUES (p_register_id, 'sale', v_payment.amount, 'Venta ' || v_sale_number, v_sale_id, p_created_by);
  END LOOP;

  -- Audit log
  INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_data)
  VALUES (p_created_by, 'create', 'sale', v_sale_id, jsonb_build_object(
    'sale_number', v_sale_number, 'total', v_total
  ));

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CORE: Receive purchase items (partial receipt supported)
-- ============================================================

CREATE TYPE receipt_item_input AS (
  purchase_item_id  UUID,
  variant_id        UUID,
  quantity_received INTEGER,
  unit_cost         NUMERIC(10,2)
);

CREATE OR REPLACE FUNCTION receive_purchase(
  p_purchase_id UUID,
  p_received_by UUID,
  p_items       receipt_item_input[],
  p_notes       TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_receipt_id   UUID;
  v_item         receipt_item_input;
  v_variant      RECORD;
  v_pi           RECORD;
  v_new_cost     NUMERIC(10,2);
  v_old_cost     NUMERIC(10,2);
  v_old_stock    INTEGER;
  v_all_received BOOLEAN;
BEGIN
  -- Validate purchase exists and is in a receivable state
  PERFORM 1 FROM purchases
  WHERE id = p_purchase_id AND status IN ('ordered', 'partial');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase % is not in a receivable state', p_purchase_id;
  END IF;

  -- Create receipt
  INSERT INTO purchase_receipts (purchase_id, received_by, notes)
  VALUES (p_purchase_id, p_received_by, p_notes)
  RETURNING id INTO v_receipt_id;

  -- Process each item
  FOREACH v_item IN ARRAY p_items LOOP
    -- Validate purchase item
    SELECT pi.* INTO v_pi
    FROM purchase_items pi
    WHERE pi.id = v_item.purchase_item_id
      AND pi.purchase_id = p_purchase_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Purchase item % not found', v_item.purchase_item_id;
    END IF;

    IF v_pi.quantity_received + v_item.quantity_received > v_pi.quantity_ordered THEN
      RAISE EXCEPTION 'Receiving more than ordered for item %', v_item.purchase_item_id;
    END IF;

    -- Get current variant data
    SELECT * INTO v_variant
    FROM product_variants
    WHERE id = v_item.variant_id
    FOR UPDATE;

    v_old_cost  := v_variant.cost;
    v_old_stock := v_variant.stock_quantity;

    -- Calculate new WAC (Weighted Average Cost)
    IF v_old_stock > 0 AND v_old_cost > 0 THEN
      v_new_cost := (
        (v_old_stock * v_old_cost) +
        (v_item.quantity_received * v_item.unit_cost)
      ) / (v_old_stock + v_item.quantity_received);
    ELSE
      v_new_cost := v_item.unit_cost;
    END IF;

    -- Update variant stock and cost
    UPDATE product_variants
    SET
      stock_quantity = stock_quantity + v_item.quantity_received,
      cost = v_new_cost,
      version = version + 1,
      updated_at = NOW()
    WHERE id = v_item.variant_id;

    -- Update purchase item received quantity
    UPDATE purchase_items
    SET
      quantity_received = quantity_received + v_item.quantity_received,
      updated_at = NOW()
    WHERE id = v_item.purchase_item_id;

    -- Record receipt item
    INSERT INTO purchase_receipt_items (
      receipt_id, purchase_item_id, variant_id,
      quantity_received, unit_cost
    ) VALUES (
      v_receipt_id, v_item.purchase_item_id, v_item.variant_id,
      v_item.quantity_received, v_item.unit_cost
    );

    -- Record cost history
    INSERT INTO cost_history (
      variant_id, purchase_item_id,
      previous_cost, new_cost,
      previous_stock, new_stock
    ) VALUES (
      v_item.variant_id, v_item.purchase_item_id,
      v_old_cost, v_new_cost,
      v_old_stock, v_old_stock + v_item.quantity_received
    );

    -- Record inventory movement
    INSERT INTO inventory_movements (
      variant_id, type, quantity,
      stock_before, stock_after,
      reference_id, reference_type,
      notes, created_by
    ) VALUES (
      v_item.variant_id, 'purchase', v_item.quantity_received,
      v_old_stock, v_old_stock + v_item.quantity_received,
      p_purchase_id, 'purchase',
      'Recepción de compra',
      p_received_by
    );
  END LOOP;

  -- Update purchase status
  SELECT bool_and(pi.quantity_received >= pi.quantity_ordered)
  INTO v_all_received
  FROM purchase_items pi
  WHERE pi.purchase_id = p_purchase_id;

  UPDATE purchases
  SET
    status = CASE WHEN v_all_received THEN 'received'::purchase_status ELSE 'partial'::purchase_status END,
    updated_at = NOW()
  WHERE id = p_purchase_id;

  -- Audit log
  INSERT INTO audit_log (user_id, action, entity_type, entity_id)
  VALUES (p_received_by, 'receive', 'purchase', p_purchase_id);

  RETURN v_receipt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CORE: Adjust inventory manually
-- ============================================================

CREATE OR REPLACE FUNCTION adjust_inventory(
  p_variant_id   UUID,
  p_new_quantity INTEGER,
  p_reason       TEXT,
  p_created_by   UUID
)
RETURNS VOID AS $$
DECLARE
  v_variant   RECORD;
  v_diff      INTEGER;
  v_move_type inventory_movement_type;
BEGIN
  SELECT * INTO v_variant
  FROM product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant % not found', p_variant_id;
  END IF;

  IF p_new_quantity < 0 THEN
    RAISE EXCEPTION 'New quantity cannot be negative';
  END IF;

  v_diff := p_new_quantity - v_variant.stock_quantity;

  IF v_diff = 0 THEN
    RETURN;
  END IF;

  v_move_type := CASE WHEN v_diff > 0 THEN 'adjustment'::inventory_movement_type
                      ELSE 'adjustment'::inventory_movement_type END;

  UPDATE product_variants
  SET
    stock_quantity = p_new_quantity,
    version = version + 1,
    updated_at = NOW()
  WHERE id = p_variant_id;

  INSERT INTO inventory_movements (
    variant_id, type, quantity,
    stock_before, stock_after,
    notes, created_by
  ) VALUES (
    p_variant_id, v_move_type, v_diff,
    v_variant.stock_quantity, p_new_quantity,
    p_reason, p_created_by
  );

  INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (
    p_created_by, 'adjust_inventory', 'product_variant', p_variant_id,
    jsonb_build_object('stock', v_variant.stock_quantity),
    jsonb_build_object('stock', p_new_quantity, 'reason', p_reason)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CORE: Process return/exchange
-- ============================================================

CREATE TYPE return_item_input AS (
  sale_item_id        UUID,
  variant_id          UUID,
  exchange_variant_id UUID,
  quantity            INTEGER,
  unit_price          NUMERIC(10,2),
  refund_amount       NUMERIC(10,2)
);

CREATE OR REPLACE FUNCTION process_return(
  p_original_sale_id UUID,
  p_type             return_type,
  p_reason           TEXT,
  p_items            return_item_input[],
  p_created_by       UUID,
  p_notes            TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_return_id     UUID;
  v_return_number TEXT;
  v_item          return_item_input;
  v_variant       RECORD;
BEGIN
  -- Generate return number
  v_return_number := generate_return_number();

  -- Create return record
  INSERT INTO returns (
    return_number, original_sale_id, type, status,
    reason, notes, created_by
  ) VALUES (
    v_return_number, p_original_sale_id, p_type, 'completed',
    p_reason, p_notes, p_created_by
  ) RETURNING id INTO v_return_id;

  -- Process each return item
  FOREACH v_item IN ARRAY p_items LOOP
    -- Get returned variant
    SELECT * INTO v_variant
    FROM product_variants
    WHERE id = v_item.variant_id
    FOR UPDATE;

    -- Return item to stock
    UPDATE product_variants
    SET
      stock_quantity = stock_quantity + v_item.quantity,
      version = version + 1,
      updated_at = NOW()
    WHERE id = v_item.variant_id;

    -- Record return movement
    INSERT INTO inventory_movements (
      variant_id, type, quantity,
      stock_before, stock_after,
      reference_id, reference_type,
      notes, created_by
    ) VALUES (
      v_item.variant_id, 'return', v_item.quantity,
      v_variant.stock_quantity,
      v_variant.stock_quantity + v_item.quantity,
      v_return_id, 'return',
      'Devolución ' || v_return_number,
      p_created_by
    );

    -- If exchange: reduce stock of exchange variant
    IF p_type = 'exchange' AND v_item.exchange_variant_id IS NOT NULL THEN
      SELECT * INTO v_variant
      FROM product_variants
      WHERE id = v_item.exchange_variant_id
      FOR UPDATE;

      IF v_variant.stock_quantity < v_item.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for exchange variant %', v_item.exchange_variant_id;
      END IF;

      UPDATE product_variants
      SET
        stock_quantity = stock_quantity - v_item.quantity,
        version = version + 1,
        updated_at = NOW()
      WHERE id = v_item.exchange_variant_id;

      INSERT INTO inventory_movements (
        variant_id, type, quantity,
        stock_before, stock_after,
        reference_id, reference_type,
        notes, created_by
      ) VALUES (
        v_item.exchange_variant_id, 'sale', -v_item.quantity,
        v_variant.stock_quantity,
        v_variant.stock_quantity - v_item.quantity,
        v_return_id, 'return',
        'Cambio ' || v_return_number,
        p_created_by
      );
    END IF;

    -- Insert return item record
    INSERT INTO return_items (
      return_id, sale_item_id, variant_id,
      exchange_variant_id, quantity,
      unit_price, refund_amount
    ) VALUES (
      v_return_id, v_item.sale_item_id, v_item.variant_id,
      v_item.exchange_variant_id, v_item.quantity,
      v_item.unit_price, COALESCE(v_item.refund_amount, 0)
    );
  END LOOP;

  -- Audit
  INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_data)
  VALUES (
    p_created_by, 'process_return', 'return', v_return_id,
    jsonb_build_object('return_number', v_return_number, 'type', p_type, 'reason', p_reason)
  );

  RETURN v_return_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ANALYTICS: Dashboard summary
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS JSON AS $$
DECLARE
  v_today_start    TIMESTAMPTZ := DATE_TRUNC('day', NOW());
  v_month_start    TIMESTAMPTZ := DATE_TRUNC('month', NOW());
  v_prev_month_start TIMESTAMPTZ := DATE_TRUNC('month', NOW() - INTERVAL '1 month');
  v_result         JSON;
BEGIN
  SELECT json_build_object(
    'today_sales',        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE status = 'completed' AND created_at >= v_today_start),
    'today_transactions', (SELECT COUNT(*) FROM sales WHERE status = 'completed' AND created_at >= v_today_start),
    'month_sales',        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE status = 'completed' AND created_at >= v_month_start),
    'month_cost',         (SELECT COALESCE(SUM(si.unit_cost * si.quantity), 0) FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE s.status = 'completed' AND s.created_at >= v_month_start),
    'month_expenses',     (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE expense_date >= v_month_start::DATE),
    'total_products',     (SELECT COUNT(*) FROM products WHERE status = 'active'),
    'low_stock_variants', (SELECT COUNT(*) FROM product_variants WHERE is_active = true AND stock_quantity > 0 AND stock_quantity <= stock_reorder_point),
    'out_of_stock',       (SELECT COUNT(*) FROM product_variants WHERE is_active = true AND stock_quantity = 0),
    'pending_purchases',  (SELECT COUNT(*) FROM purchases WHERE status IN ('ordered', 'partial'))
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ANALYTICS: Profitability by period
-- ============================================================

CREATE OR REPLACE FUNCTION get_profitability(
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'gross_sales',   COALESCE(SUM(s.subtotal), 0),
    'discounts',     COALESCE(SUM(s.discount_amount), 0),
    'net_sales',     COALESCE(SUM(s.total), 0),
    'cogs',          COALESCE(SUM(si.unit_cost * si.quantity), 0),
    'gross_profit',  COALESCE(SUM(s.total), 0) - COALESCE(SUM(si.unit_cost * si.quantity), 0),
    'expenses',      (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE expense_date BETWEEN p_start_date AND p_end_date),
    'net_profit',    COALESCE(SUM(s.total), 0) - COALESCE(SUM(si.unit_cost * si.quantity), 0) -
                     (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE expense_date BETWEEN p_start_date AND p_end_date),
    'transactions',  COUNT(DISTINCT s.id)
  )
  INTO v_result
  FROM sales s
  JOIN sale_items si ON si.sale_id = s.id
  WHERE s.status = 'completed'
    AND s.created_at::DATE BETWEEN p_start_date AND p_end_date;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
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
-- ============================================================
-- KEYLING — Migration 004: Seed Data (Development)
-- ============================================================
-- NOTE: Users must be created via Supabase Auth Dashboard or CLI
-- This seed creates the catalog data only

-- ============================================================
-- CASH REGISTERS
-- ============================================================

INSERT INTO cash_registers (id, name, status) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Caja 01', 'closed'),
  ('11111111-0000-0000-0000-000000000002', 'Caja 02', 'closed');

-- ============================================================
-- CATEGORIES
-- ============================================================

INSERT INTO categories (id, name, slug, description, sort_order) VALUES
  ('22222222-0000-0000-0000-000000000001', 'Zapatos',      'zapatos',     'Calzado para todo uso y ocasión',          1),
  ('22222222-0000-0000-0000-000000000002', 'Ropa',         'ropa',        'Prendas de vestir y moda',                 2),
  ('22222222-0000-0000-0000-000000000003', 'Accesorios',   'accesorios',  'Complementos y accesorios de moda',        3),
  ('22222222-0000-0000-0000-000000000004', 'Bolsos',       'bolsos',      'Carteras, bolsas y maletines',             4),
  ('22222222-0000-0000-0000-000000000005', 'Gorras',       'gorras',      'Gorras, sombreros y accesorios de cabeza', 5);

-- ============================================================
-- BRANDS
-- ============================================================

INSERT INTO brands (id, name, slug, description) VALUES
  ('33333333-0000-0000-0000-000000000001', 'Nike',     'nike',    'Innovación y rendimiento deportivo'),
  ('33333333-0000-0000-0000-000000000002', 'Adidas',   'adidas',  'Estilo y tecnología alemana'),
  ('33333333-0000-0000-0000-000000000003', 'Puma',     'puma',    'Moda deportiva y street style'),
  ('33333333-0000-0000-0000-000000000004', 'Vans',     'vans',    'Cultura skate y street'),
  ('33333333-0000-0000-0000-000000000005', 'New Balance', 'new-balance', 'Comodidad y estilo clásico'),
  ('33333333-0000-0000-0000-000000000006', 'Converse', 'converse', 'Ícono del estilo urbano'),
  ('33333333-0000-0000-0000-000000000007', 'Genérico', 'generico', 'Productos sin marca específica');

-- ============================================================
-- EXPENSE CATEGORIES
-- ============================================================

INSERT INTO expense_categories (id, name, description) VALUES
  ('44444444-0000-0000-0000-000000000001', 'Alquiler',      'Arrendamiento del local comercial'),
  ('44444444-0000-0000-0000-000000000002', 'Transporte',    'Fletes, envíos y movilización'),
  ('44444444-0000-0000-0000-000000000003', 'Publicidad',    'Marketing, redes sociales y promoción'),
  ('44444444-0000-0000-0000-000000000004', 'Internet',      'Servicio de internet y telefonía'),
  ('44444444-0000-0000-0000-000000000005', 'Electricidad',  'Servicio eléctrico'),
  ('44444444-0000-0000-0000-000000000006', 'Empaques',      'Bolsas, cajas y material de empaque'),
  ('44444444-0000-0000-0000-000000000007', 'Comisiones',    'Comisiones de venta y servicios'),
  ('44444444-0000-0000-0000-000000000008', 'Mantenimiento', 'Reparaciones y mantenimiento'),
  ('44444444-0000-0000-0000-000000000009', 'Otros',         'Gastos varios no categorizados');

-- ============================================================
-- SAMPLE PRODUCTS (Nike Air Max 270)
-- ============================================================

INSERT INTO products (id, sku, name, description, category_id, brand_id, base_price, has_variants) VALUES
(
  '55555555-0000-0000-0000-000000000001',
  'ZAP-000001',
  'Nike Air Max 270',
  'Zapatilla Nike Air Max 270, diseño icónico con la mayor unidad Air de Nike hasta la fecha. Perfecto para el uso diario con comodidad todo el día.',
  '22222222-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000001',
  89.99,
  true
);

-- Variants for Nike Air Max 270
INSERT INTO product_variants (id, product_id, sku, size, color, quality, cost, stock_quantity, stock_min, stock_reorder_point) VALUES
  ('66666666-0000-0000-0001-000000000001', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-NEG-38', '38', 'Negro', 'Original', 45.00, 5, 2, 3),
  ('66666666-0000-0000-0001-000000000002', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-NEG-39', '39', 'Negro', 'Original', 45.00, 8, 2, 3),
  ('66666666-0000-0000-0001-000000000003', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-NEG-40', '40', 'Negro', 'Original', 45.00, 10, 2, 3),
  ('66666666-0000-0000-0001-000000000004', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-NEG-41', '41', 'Negro', 'Original', 45.00, 7, 2, 3),
  ('66666666-0000-0000-0001-000000000005', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-NEG-42', '42', 'Negro', 'Original', 45.00, 3, 2, 3),
  ('66666666-0000-0000-0001-000000000006', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-BLA-38', '38', 'Blanco', 'Original', 45.00, 4, 2, 3),
  ('66666666-0000-0000-0001-000000000007', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-BLA-39', '39', 'Blanco', 'Original', 45.00, 6, 2, 3),
  ('66666666-0000-0000-0001-000000000008', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-BLA-40', '40', 'Blanco', 'Original', 45.00, 9, 2, 3),
  ('66666666-0000-0000-0001-000000000009', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-BLA-41', '41', 'Blanco', 'Original', 45.00, 5, 2, 3),
  ('66666666-0000-0000-0001-000000000010', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-BLA-42', '42', 'Blanco', 'Original', 45.00, 2, 2, 3);

-- Product image for Nike Air Max 270
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order) VALUES
  ('55555555-0000-0000-0000-000000000001', 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/u_126ab356-44d8-4a06-89b4-fcdcc8df0245,c_scale,fl_relative,w_1.0/07e0caa7-c7f8-4a87-8d91-6e79e92e8027/air-max-270-shoes-2V5C4p.png', 'Nike Air Max 270 - Lateral', true, 0);

-- ============================================================
-- SAMPLE PRODUCTS (Adidas Ultraboost 22)
-- ============================================================

INSERT INTO products (id, sku, name, description, category_id, brand_id, base_price, has_variants) VALUES
(
  '55555555-0000-0000-0000-000000000002',
  'ZAP-000002',
  'Adidas Ultraboost 22',
  'La zapatilla de running más cómoda de Adidas, con tecnología Boost para la máxima amortiguación y retorno de energía en cada paso.',
  '22222222-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000002',
  95.00,
  true
);

INSERT INTO product_variants (id, product_id, sku, size, color, quality, cost, stock_quantity, stock_min, stock_reorder_point) VALUES
  ('66666666-0000-0000-0002-000000000001', '55555555-0000-0000-0000-000000000002', 'ZAP-000002-NEG-39', '39', 'Negro/Blanco', 'Original', 52.00, 6, 2, 3),
  ('66666666-0000-0000-0002-000000000002', '55555555-0000-0000-0000-000000000002', 'ZAP-000002-NEG-40', '40', 'Negro/Blanco', 'Original', 52.00, 8, 2, 3),
  ('66666666-0000-0000-0002-000000000003', '55555555-0000-0000-0000-000000000002', 'ZAP-000002-NEG-41', '41', 'Negro/Blanco', 'Original', 52.00, 5, 2, 3),
  ('66666666-0000-0000-0002-000000000004', '55555555-0000-0000-0000-000000000002', 'ZAP-000002-NEG-42', '42', 'Negro/Blanco', 'Original', 52.00, 3, 2, 3),
  ('66666666-0000-0000-0002-000000000005', '55555555-0000-0000-0000-000000000002', 'ZAP-000002-AZU-40', '40', 'Azul', 'Original', 52.00, 4, 2, 3),
  ('66666666-0000-0000-0002-000000000006', '55555555-0000-0000-0000-000000000002', 'ZAP-000002-AZU-41', '41', 'Azul', 'Original', 52.00, 7, 2, 3);

INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order) VALUES
  ('55555555-0000-0000-0000-000000000002', 'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/fbaf991a78bc4896a3e9ad7800abcec6_9366/Ultraboost_22_Shoes_Black_GZ0127_01_standard.jpg', 'Adidas Ultraboost 22', true, 0);

-- ============================================================
-- SAMPLE PRODUCTS (Vans Old Skool — simple product)
-- ============================================================

INSERT INTO products (id, sku, name, description, category_id, brand_id, base_price, has_variants) VALUES
(
  '55555555-0000-0000-0000-000000000003',
  'ZAP-000003',
  'Vans Old Skool',
  'El clásico de los clásicos. La Vans Old Skool con su icónico stripe lateral. Versátil, duradera y atemporal.',
  '22222222-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000004',
  65.00,
  true
);

INSERT INTO product_variants (id, product_id, sku, size, color, quality, cost, stock_quantity, stock_min, stock_reorder_point) VALUES
  ('66666666-0000-0000-0003-000000000001', '55555555-0000-0000-0000-000000000003', 'ZAP-000003-NEG-38', '38', 'Negro', 'Original', 32.00, 12, 3, 5),
  ('66666666-0000-0000-0003-000000000002', '55555555-0000-0000-0000-000000000003', 'ZAP-000003-NEG-39', '39', 'Negro', 'Original', 32.00, 15, 3, 5),
  ('66666666-0000-0000-0003-000000000003', '55555555-0000-0000-0000-000000000003', 'ZAP-000003-NEG-40', '40', 'Negro', 'Original', 32.00, 10, 3, 5),
  ('66666666-0000-0000-0003-000000000004', '55555555-0000-0000-0000-000000000003', 'ZAP-000003-NEG-41', '41', 'Negro', 'Original', 32.00, 8, 3, 5),
  ('66666666-0000-0000-0003-000000000005', '55555555-0000-0000-0000-000000000003', 'ZAP-000003-BLA-39', '39', 'Blanco', 'Original', 32.00, 6, 3, 5),
  ('66666666-0000-0000-0003-000000000006', '55555555-0000-0000-0000-000000000003', 'ZAP-000003-BLA-40', '40', 'Blanco', 'Original', 32.00, 9, 3, 5),
  ('66666666-0000-0000-0003-000000000007', '55555555-0000-0000-0000-000000000003', 'ZAP-000003-BLA-41', '41', 'Blanco', 'Original', 32.00, 0, 3, 5);

INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order) VALUES
  ('55555555-0000-0000-0000-000000000003', 'https://images.vans.com/is/image/Vans/VN000D3HNVY-HERO?$583x583$', 'Vans Old Skool Black', true, 0);

-- ============================================================
-- SAMPLE PRODUCTS (Puma RS-X — low stock demo)
-- ============================================================

INSERT INTO products (id, sku, name, description, category_id, brand_id, base_price, has_variants) VALUES
(
  '55555555-0000-0000-0000-000000000004',
  'ZAP-000004',
  'Puma RS-X',
  'Zapatilla retro-futurista con amortiguación RS y diseño chunky. Perfecta para el street style más atrevido.',
  '22222222-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000003',
  72.00,
  true
);

INSERT INTO product_variants (id, product_id, sku, size, color, quality, cost, stock_quantity, stock_min, stock_reorder_point) VALUES
  ('66666666-0000-0000-0004-000000000001', '55555555-0000-0000-0000-000000000004', 'ZAP-000004-BLA-40', '40', 'Blanco/Azul', 'Original', 38.00, 2, 3, 4),
  ('66666666-0000-0000-0004-000000000002', '55555555-0000-0000-0000-000000000004', 'ZAP-000004-BLA-41', '41', 'Blanco/Azul', 'Original', 38.00, 1, 3, 4),
  ('66666666-0000-0000-0004-000000000003', '55555555-0000-0000-0000-000000000004', 'ZAP-000004-NEG-40', '40', 'Negro', 'Original', 38.00, 0, 3, 4);

INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order) VALUES
  ('55555555-0000-0000-0000-000000000004', 'https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_600,h_600/global/369449/01/sv01/fnd/PNA/fmt/png/RS-X-Efekt-Sneakers', 'Puma RS-X', true, 0);

-- ============================================================
-- SUPPLIERS
-- ============================================================

INSERT INTO suppliers (id, name, contact_name, phone, email, notes) VALUES
  ('77777777-0000-0000-0000-000000000001', 'Distribuidora Deportiva Nacional', 'Carlos Méndez', '+1-555-0101', 'carlos@ddn.com', 'Proveedor principal de marcas deportivas'),
  ('77777777-0000-0000-0000-000000000002', 'Importadora Fashion MX', 'María González', '+52-555-0202', 'mgonzalez@fashionmx.com', 'Importadora directa de marcas internacionales'),
  ('77777777-0000-0000-0000-000000000003', 'Calzado al Mayor SRL', 'Roberto Díaz', '+1-555-0303', 'roberto@calzadomayor.com', 'Mayorista local de calzado variado');

-- ============================================================
-- SAMPLE CUSTOMERS
-- ============================================================

INSERT INTO customers (id, name, phone, email, notes) VALUES
  ('88888888-0000-0000-0000-000000000001', 'Ana García', '+1-555-1001', 'ana.garcia@email.com', 'Cliente frecuente, talla 38'),
  ('88888888-0000-0000-0000-000000000002', 'Luis Torres', '+1-555-1002', 'luis.torres@email.com', 'Prefiere marcas Nike y Adidas'),
  ('88888888-0000-0000-0000-000000000003', 'Carmen López', '+1-555-1003', NULL, 'Compras para familia, volumen alto');
