-- ============================================================
-- CASH REGISTER SESSIONS (SHIFT HISTORY)
-- ============================================================

CREATE TABLE cash_register_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  register_id         UUID NOT NULL REFERENCES cash_registers(id),
  opened_by           UUID NOT NULL REFERENCES profiles(id),
  opened_at           TIMESTAMPTZ NOT NULL,
  initial_amount      NUMERIC(10,2) NOT NULL,
  closed_by           UUID REFERENCES profiles(id),
  closed_at           TIMESTAMPTZ,
  expected_cash       NUMERIC(10,2),
  counted_cash        NUMERIC(10,2),
  difference          NUMERIC(10,2),
  total_sales_count   INTEGER DEFAULT 0,
  total_sales_amount  NUMERIC(10,2) DEFAULT 0,
  total_cash          NUMERIC(10,2) DEFAULT 0,
  total_card          NUMERIC(10,2) DEFAULT 0,
  total_transfer      NUMERIC(10,2) DEFAULT 0,
  total_mobile        NUMERIC(10,2) DEFAULT 0,
  total_other         NUMERIC(10,2) DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for cash_register_sessions
CREATE POLICY "Enable read access for all authenticated users" ON cash_register_sessions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON cash_register_sessions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON cash_register_sessions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
