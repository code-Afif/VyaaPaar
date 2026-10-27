-- ============================================================================
-- DUKAANSAATHI (VYAAPAAR) - PHASE 2 INITIAL DATABASE SCHEMA
-- Fintech ledger, customers, payment reconciliation, inventory & append-only rules
-- All monetary amounts stored as positive BIGINT integer paise.
-- ============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. MERCHANTS TABLE
CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT,
    upi_id TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'hi',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. LEDGER ENTRIES (STRICTLY APPEND-ONLY)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (
        entry_type IN (
            'credit_sale',
            'repayment',
            'opening_balance',
            'expense',
            'adjustment_credit',
            'adjustment_debit'
        )
    ),
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    description TEXT,
    source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (
        source IN ('VOICE', 'MANUAL', 'RECONCILED', 'SIMULATOR')
    ),
    idempotency_key TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index to prevent duplicate financial transaction writes per merchant
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_idempotency 
ON public.ledger_entries(merchant_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- 4. PAYMENT EVENTS (PAYTM / UPI RECONCILIATION)
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'PAYTM_QR',
    provider_transaction_id TEXT NOT NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    status TEXT NOT NULL DEFAULT 'UNMATCHED' CHECK (
        status IN ('SUCCESS', 'PENDING', 'RECONCILED', 'UNMATCHED', 'FAILED')
    ),
    is_simulated BOOLEAN NOT NULL DEFAULT false,
    match_state TEXT NOT NULL DEFAULT 'PENDING' CHECK (
        match_state IN ('PENDING', 'SUGGESTED', 'MANUAL', 'RECONCILED', 'DISMISSED')
    ),
    matched_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    reconciled_ledger_entry_id UUID REFERENCES public.ledger_entries(id) ON DELETE SET NULL,
    payer_name TEXT,
    payer_upi TEXT,
    match_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uniqueness constraint: Prevent the same provider payment from being registered twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_provider_tx
ON public.payment_events(merchant_id, provider, provider_transaction_id);

-- 5. PRODUCTS / INVENTORY
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    hindi_name TEXT,
    category TEXT NOT NULL DEFAULT 'General',
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reorder_threshold INTEGER NOT NULL DEFAULT 5 CHECK (reorder_threshold >= 0),
    unit TEXT NOT NULL DEFAULT 'units',
    unit_cost_paise BIGINT NOT NULL DEFAULT 0 CHECK (unit_cost_paise >= 0),
    selling_price_paise BIGINT NOT NULL DEFAULT 0 CHECK (selling_price_paise >= 0),
    supplier_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_merchant ON public.customers(merchant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_merchant_customer ON public.ledger_entries(merchant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON public.ledger_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_merchant_status ON public.payment_events(merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_products_merchant ON public.products(merchant_id);

-- ============================================================================
-- FINANCIAL INTEGRITY: ENFORCE APPEND-ONLY LEDGER VIA TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_ledger_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Financial history is strictly append-only. Modifying or deleting ledger records is forbidden. Use adjustment entries instead.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ledger_update ON public.ledger_entries;
CREATE TRIGGER trg_prevent_ledger_update
BEFORE UPDATE OR DELETE ON public.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.prevent_ledger_tampering();

-- ============================================================================
-- AUTOMATIC MERCHANT REGISTRATION ON AUTH SIGNUP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_merchant()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.merchants (
        id,
        store_name,
        owner_name,
        phone,
        upi_id,
        preferred_language
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'store_name', 'Kirana Store'),
        COALESCE(NEW.raw_user_meta_data->>'owner_name', 'Merchant'),
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'upi_id',
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'hi')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_merchant();

-- ============================================================================
-- DETERMINISTIC BALANCE CALCULATION FUNCTION (IN INTEGER PAISE)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_customer_balance(p_customer_id UUID)
RETURNS BIGINT AS $$
DECLARE
    v_total_credit BIGINT := 0;
    v_total_repaid BIGINT := 0;
BEGIN
    -- Sum all debit increases (credit sales, opening balance, debit adjustments)
    SELECT COALESCE(SUM(amount_paise), 0)
    INTO v_total_credit
    FROM public.ledger_entries
    WHERE customer_id = p_customer_id
      AND entry_type IN ('credit_sale', 'opening_balance', 'adjustment_debit');

    -- Sum all credit decreases (repayments, credit adjustments)
    SELECT COALESCE(SUM(amount_paise), 0)
    INTO v_total_repaid
    FROM public.ledger_entries
    WHERE customer_id = p_customer_id
      AND entry_type IN ('repayment', 'adjustment_credit');

    RETURN v_total_credit - v_total_repaid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
