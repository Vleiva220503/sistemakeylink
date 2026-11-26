-- Migration: Fix cash_movements_select RLS policy
-- Problem: the old policy allowed a cashier to SELECT movements from any register
--          where opened_by = auth.uid(), including registers from past sessions
--          (a closed register still keeps opened_by set to the last opener).
--          This meant a cashier could see movements from shifts they no longer own.
--
-- Fix: restrict cashier SELECT to movements of registers that are CURRENTLY OPEN
--      AND opened_by = auth.uid(). Admin bypasses the filter as before.
--
-- Apply with: psql $DATABASE_URL -f this_file.sql
--         or: paste into Supabase SQL Editor and run.

DROP POLICY IF EXISTS "cash_movements_select" ON cash_movements;

CREATE POLICY "cash_movements_select"
  ON cash_movements FOR SELECT
  USING (
    -- Admins see everything
    is_admin()
    OR
    -- Cashiers see only movements from their CURRENTLY OPEN register
    EXISTS (
      SELECT 1 FROM cash_registers cr
      WHERE cr.id = register_id
        AND cr.opened_by = auth.uid()
        AND cr.status = 'open'
    )
  );
