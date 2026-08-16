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
