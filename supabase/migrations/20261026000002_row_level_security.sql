-- ============================================================================
-- DUKAANSAATHI (VYAAPAAR) - PHASE 2 ROW LEVEL SECURITY (RLS) POLICIES
-- Strict multi-tenant isolation based on auth.uid()
-- Append-only restrictions on financial ledger entries
-- ============================================================================

-- Enable Row Level Security on all tables
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Revoke default public/anon table privileges
REVOKE ALL ON public.merchants FROM anon;
REVOKE ALL ON public.customers FROM anon;
REVOKE ALL ON public.ledger_entries FROM anon;
REVOKE ALL ON public.payment_events FROM anon;
REVOKE ALL ON public.products FROM anon;

-- Grant authenticated users access governed by RLS
GRANT SELECT, INSERT, UPDATE ON public.merchants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT ON public.ledger_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payment_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;

-- ============================================================================
-- 1. MERCHANTS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "merchants_select_own" ON public.merchants;
CREATE POLICY "merchants_select_own"
ON public.merchants FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "merchants_update_own" ON public.merchants;
CREATE POLICY "merchants_update_own"
ON public.merchants FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "merchants_insert_own" ON public.merchants;
CREATE POLICY "merchants_insert_own"
ON public.merchants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. CUSTOMERS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "customers_select_own" ON public.customers;
CREATE POLICY "customers_select_own"
ON public.customers FOR SELECT
TO authenticated
USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "customers_insert_own" ON public.customers;
CREATE POLICY "customers_insert_own"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (merchant_id = auth.uid());

DROP POLICY IF EXISTS "customers_update_own" ON public.customers;
CREATE POLICY "customers_update_own"
ON public.customers FOR UPDATE
TO authenticated
USING (merchant_id = auth.uid())
WITH CHECK (merchant_id = auth.uid());

DROP POLICY IF EXISTS "customers_delete_own" ON public.customers;
CREATE POLICY "customers_delete_own"
ON public.customers FOR DELETE
TO authenticated
USING (merchant_id = auth.uid());

-- ============================================================================
-- 3. LEDGER ENTRIES POLICIES (STRICTLY INSERT & SELECT ONLY)
-- ============================================================================
DROP POLICY IF EXISTS "ledger_select_own" ON public.ledger_entries;
CREATE POLICY "ledger_select_own"
ON public.ledger_entries FOR SELECT
TO authenticated
USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "ledger_insert_own" ON public.ledger_entries;
CREATE POLICY "ledger_insert_own"
ON public.ledger_entries FOR INSERT
TO authenticated
WITH CHECK (
    merchant_id = auth.uid() 
    AND (created_by IS NULL OR created_by = auth.uid())
);

-- Note: No UPDATE or DELETE policy is defined for ledger_entries.
-- Combined with trg_prevent_ledger_update, this guarantees an append-only financial ledger.

-- ============================================================================
-- 4. PAYMENT EVENTS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "payments_select_own" ON public.payment_events;
CREATE POLICY "payments_select_own"
ON public.payment_events FOR SELECT
TO authenticated
USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "payments_insert_own" ON public.payment_events;
CREATE POLICY "payments_insert_own"
ON public.payment_events FOR INSERT
TO authenticated
WITH CHECK (merchant_id = auth.uid());

DROP POLICY IF EXISTS "payments_update_reconciliation" ON public.payment_events;
CREATE POLICY "payments_update_reconciliation"
ON public.payment_events FOR UPDATE
TO authenticated
USING (merchant_id = auth.uid())
WITH CHECK (merchant_id = auth.uid());

-- ============================================================================
-- 5. PRODUCTS / INVENTORY POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "products_select_own" ON public.products;
CREATE POLICY "products_select_own"
ON public.products FOR SELECT
TO authenticated
USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "products_insert_own" ON public.products;
CREATE POLICY "products_insert_own"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (merchant_id = auth.uid());

DROP POLICY IF EXISTS "products_update_own" ON public.products;
CREATE POLICY "products_update_own"
ON public.products FOR UPDATE
TO authenticated
USING (merchant_id = auth.uid())
WITH CHECK (merchant_id = auth.uid());

DROP POLICY IF EXISTS "products_delete_own" ON public.products;
CREATE POLICY "products_delete_own"
ON public.products FOR DELETE
TO authenticated
USING (merchant_id = auth.uid());
