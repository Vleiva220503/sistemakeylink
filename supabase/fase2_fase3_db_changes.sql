-- 1. Vista para agregar sale_items
CREATE OR REPLACE VIEW sales_with_aggregates AS
SELECT 
  s.id,
  s.sale_number,
  s.status,
  s.subtotal,
  s.discount_amount,
  s.delivery_amount,
  s.delivery_type,
  s.total,
  s.amount_paid,
  s.amount_pending,
  s.notes,
  s.created_at,
  s.completed_at,
  s.created_by,
  s.customer_id,
  s.register_id,
  (SELECT COALESCE(SUM(quantity), 0) FROM sale_items WHERE sale_id = s.id) AS total_items,
  (SELECT COALESCE(SUM(discount_amount), 0) FROM sale_items WHERE sale_id = s.id) AS total_items_discount
FROM sales s;

-- 2. Índices faltantes detectados en Fase 0
CREATE INDEX IF NOT EXISTS idx_expenses_is_cancelled ON expenses(is_cancelled);
CREATE INDEX IF NOT EXISTS idx_purchases_order_date ON purchases(order_date);

-- Nota: los índices de FASE 3 como product_variants.is_active y sales.created_at
-- ya existen en tu schema original (lo confirmé en FULL_MIGRATION.sql).
