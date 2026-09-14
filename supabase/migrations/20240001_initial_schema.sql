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
