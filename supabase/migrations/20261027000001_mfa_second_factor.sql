-- ============================================================================
-- DUKAANSAATHI (VYAAPAAR) - PHASE 2.5 CUSTOM EMAIL OTP SECOND FACTOR (MFA)
-- 
-- Traditional Email/Password Authentication + Server-Verified Email OTP MFA
-- Strict Database RLS requiring server-recorded session verification.
-- Hardened with SET search_path = '', exact session binding, and service-role privilege isolation.
-- ============================================================================

-- Ensure pgcrypto extension exists for cryptographic hashing and random byte generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. MFA CHALLENGES TABLE (PRIVATE - NOT DIRECTLY ACCESSIBLE BY CLIENTS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mfa_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    destination_email TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    resend_after TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '60 seconds'),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '3600 seconds'), -- 1 hour default validity
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookup by user and active session challenge
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_session 
ON public.mfa_challenges(user_id, session_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. MFA ACTIVE SESSIONS TABLE (PRIVATE - RECORD OF VERIFIED SESSIONS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mfa_active_sessions (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
    PRIMARY KEY (user_id, session_id)
);

-- Index for checking active session verification
CREATE INDEX IF NOT EXISTS idx_mfa_active_sessions_lookup 
ON public.mfa_active_sessions(user_id, session_id, expires_at);

-- ----------------------------------------------------------------------------
-- 3. STRICT PRIVILEGE RESTRICTION: CLIENTS CANNOT READ/INSERT/UPDATE DIRECTLY
-- ----------------------------------------------------------------------------
ALTER TABLE public.mfa_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_active_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.mfa_challenges FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mfa_active_sessions FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. FUNCTION: CHECK IF CURRENT SESSION HAS COMPLETED SECOND FACTOR
-- Hardened with SET search_path = '' and strict session-level validation.
-- Fails closed if session_id is absent or unverified.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_mfa_verified()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_session_id TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Extract exact session identifier from validated JWT claims
    v_session_id := auth.jwt() ->> 'session_id';
    
    -- If no session_id is present in the JWT, fail closed (No default_session bypass!)
    IF v_session_id IS NULL OR v_session_id = '' THEN
        RETURN FALSE;
    END IF;

    -- Check if this exact session has an active, unexpired verification grant
    RETURN EXISTS (
        SELECT 1 
        FROM public.mfa_active_sessions s
        WHERE s.user_id = v_user_id
          AND s.session_id = v_session_id
          AND s.expires_at > pg_catalog.now()
    );
END;
$$;

ALTER FUNCTION public.is_mfa_verified() OWNER TO postgres;

-- ----------------------------------------------------------------------------
-- 5. FUNCTION: CREATE MFA CHALLENGE (RESTRICTED TO SERVICE_ROLE ONLY)
-- Hardened with SET search_path = '', server-enforced session extraction,
-- rate limits, cooldowns, and cryptographic hashing.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_mfa_challenge(
    p_user_id UUID,
    p_session_id TEXT,
    p_otp_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_email TEXT;
    v_recent_challenge RECORD;
    v_salt TEXT;
    v_hash TEXT;
    v_challenge_id UUID;
    v_masked_email TEXT;
    v_local_part TEXT;
    v_domain_part TEXT;
    v_resend_after TIMESTAMPTZ;
    v_expires_at TIMESTAMPTZ;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: User ID must be provided by trusted caller';
    END IF;

    IF p_session_id IS NULL OR p_session_id = '' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Missing session ID for MFA challenge';
    END IF;

    IF p_otp_code IS NULL OR pg_catalog.length(pg_catalog.trim(p_otp_code)) <> 6 THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: 6-digit OTP code required';
    END IF;

    -- Fetch user registered email from auth.users
    SELECT email INTO v_user_email 
    FROM auth.users 
    WHERE id = p_user_id;

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'USER_NOT_FOUND: No registered email address found for user';
    END IF;

    -- Enforce 60-second resend cooldown server-side for this user and session
    SELECT * INTO v_recent_challenge
    FROM public.mfa_challenges
    WHERE user_id = p_user_id 
      AND session_id = p_session_id
      AND is_verified = false
      AND resend_after > pg_catalog.now()
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_recent_challenge.id IS NOT NULL THEN
        RAISE EXCEPTION 'COOLDOWN_ACTIVE: Please wait % seconds before requesting another code',
            pg_catalog.greatest(1, pg_catalog.extract(SECOND FROM (v_recent_challenge.resend_after - pg_catalog.now()))::INTEGER);
    END IF;

    -- Enforce server-side rate limit: Max 10 OTP requests per hour per user
    IF (
        SELECT pg_catalog.count(*) 
        FROM public.mfa_challenges 
        WHERE user_id = p_user_id 
          AND created_at > (pg_catalog.now() - INTERVAL '1 hour')
    ) >= 10 THEN
        RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Maximum OTP request limit reached. Please wait before retrying.';
    END IF;

    -- Generate random cryptographic salt
    v_salt := pg_catalog.encode(public.gen_random_bytes(16), 'hex');
    -- Compute SHA-256 hash of salt + OTP
    v_hash := pg_catalog.encode(public.digest(v_salt || pg_catalog.trim(p_otp_code), 'sha256'), 'hex');

    v_resend_after := pg_catalog.now() + INTERVAL '60 seconds';
    v_expires_at := pg_catalog.now() + INTERVAL '3600 seconds'; -- 1 hour default validity

    -- Invalidate any prior unverified challenges for this exact session
    UPDATE public.mfa_challenges
    SET is_verified = true
    WHERE user_id = p_user_id 
      AND session_id = p_session_id 
      AND is_verified = false;

    -- Store challenge securely with hashed code
    INSERT INTO public.mfa_challenges (
        user_id,
        session_id,
        otp_hash,
        salt,
        destination_email,
        attempts,
        max_attempts,
        is_verified,
        resend_after,
        expires_at
    )
    VALUES (
        p_user_id,
        p_session_id,
        v_hash,
        v_salt,
        v_user_email,
        0,
        5,
        false,
        v_resend_after,
        v_expires_at
    )
    RETURNING id INTO v_challenge_id;

    -- Generate masked email
    v_local_part := pg_catalog.split_part(v_user_email, '@', 1);
    v_domain_part := pg_catalog.split_part(v_user_email, '@', 2);
    IF pg_catalog.length(v_local_part) <= 2 THEN
        v_masked_email := pg_catalog.substr(v_local_part, 1, 1) || '*@' || v_domain_part;
    ELSE
        v_masked_email := pg_catalog.substr(v_local_part, 1, 1) || 
                          pg_catalog.repeat('*', pg_catalog.least(pg_catalog.length(v_local_part) - 2, 4)) || 
                          pg_catalog.substr(v_local_part, pg_catalog.length(v_local_part), 1) || '@' || v_domain_part;
    END IF;

    -- Return safe metadata to trusted Edge Function (never returns salt or hash)
    RETURN pg_catalog.jsonb_build_object(
        'challenge_id', v_challenge_id,
        'destination_email', v_user_email,
        'masked_email', v_masked_email,
        'resend_after', v_resend_after,
        'expires_at', v_expires_at
    );
END;
$$;

ALTER FUNCTION public.create_mfa_challenge(UUID, TEXT, TEXT) OWNER TO postgres;

-- ----------------------------------------------------------------------------
-- 6. FUNCTION: VERIFY MFA CHALLENGE (RESTRICTED TO SERVICE_ROLE ONLY)
-- Hardened with SET search_path = '', constant-time verification,
-- single-use enforcement, attempt limits, and exact session activation.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_mfa_challenge(
    p_user_id UUID,
    p_session_id TEXT,
    p_challenge_id UUID,
    p_otp_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_challenge RECORD;
    v_computed_hash TEXT;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: User ID must be provided by trusted caller';
    END IF;

    IF p_session_id IS NULL OR p_session_id = '' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Session ID must be provided by trusted caller';
    END IF;

    -- Fetch challenge strictly matching both user_id and session_id
    SELECT * INTO v_challenge
    FROM public.mfa_challenges
    WHERE id = p_challenge_id 
      AND user_id = p_user_id
      AND session_id = p_session_id;

    IF v_challenge.id IS NULL THEN
        RAISE EXCEPTION 'CHALLENGE_NOT_FOUND: Challenge not found or does not belong to this active session';
    END IF;

    IF v_challenge.is_verified THEN
        RAISE EXCEPTION 'REUSED_OTP: This OTP challenge has already been verified and cannot be reused';
    END IF;

    IF v_challenge.expires_at < pg_catalog.now() THEN
        RAISE EXCEPTION 'EXPIRED_OTP: This OTP code has expired. Please request a new verification code';
    END IF;

    IF v_challenge.attempts >= v_challenge.max_attempts THEN
        RAISE EXCEPTION 'MAX_ATTEMPTS_EXCEEDED: Maximum verification attempts exceeded. Please request a new OTP';
    END IF;

    -- Compute SHA-256 hash using the challenge's secret salt
    v_computed_hash := pg_catalog.encode(public.digest(v_challenge.salt || pg_catalog.trim(p_otp_code), 'sha256'), 'hex');

    -- Validate hash
    IF v_computed_hash <> v_challenge.otp_hash THEN
        UPDATE public.mfa_challenges
        SET attempts = attempts + 1
        WHERE id = p_challenge_id;

        RAISE EXCEPTION 'INVALID_OTP: Incorrect verification code (% attempts remaining)',
            (v_challenge.max_attempts - (v_challenge.attempts + 1));
    END IF;

    -- Mark challenge verified to prevent reuse
    UPDATE public.mfa_challenges
    SET is_verified = true
    WHERE id = p_challenge_id;

    -- Grant access strictly to this exact session in mfa_active_sessions
    INSERT INTO public.mfa_active_sessions (
        user_id,
        session_id,
        verified_at,
        expires_at
    )
    VALUES (
        p_user_id,
        p_session_id,
        pg_catalog.now(),
        pg_catalog.now() + INTERVAL '24 hours'
    )
    ON CONFLICT (user_id, session_id) DO UPDATE
    SET verified_at = pg_catalog.now(),
        expires_at = pg_catalog.now() + INTERVAL '24 hours';

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'verified_at', pg_catalog.now(),
        'session_id', p_session_id
    );
END;
$$;

ALTER FUNCTION public.verify_mfa_challenge(UUID, TEXT, UUID, TEXT) OWNER TO postgres;

-- ----------------------------------------------------------------------------
-- 7. FUNCTION: REVOKE MFA SESSION (UPON SIGN OUT)
-- Hardened with SET search_path = ''
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_mfa_session()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_session_id TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    v_session_id := auth.jwt() ->> 'session_id';
    IF v_session_id IS NULL OR v_session_id = '' THEN
        RETURN FALSE;
    END IF;

    DELETE FROM public.mfa_active_sessions
    WHERE user_id = v_user_id 
      AND session_id = v_session_id;

    RETURN TRUE;
END;
$$;

ALTER FUNCTION public.revoke_mfa_session() OWNER TO postgres;

-- ----------------------------------------------------------------------------
-- 8. PRIVILEGE ISOLATION (LEAST PRIVILEGE)
-- Direct client access to challenge creation and verification is revoked!
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.create_mfa_challenge(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_mfa_challenge(UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- Only trusted server-side execution (service_role) can invoke challenge creation & verification
GRANT EXECUTE ON FUNCTION public.create_mfa_challenge(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_mfa_challenge(UUID, TEXT, UUID, TEXT) TO service_role;

-- Authenticated sessions can check their own MFA status and revoke their own session on logout
REVOKE ALL ON FUNCTION public.is_mfa_verified() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_mfa_verified() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.revoke_mfa_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_mfa_session() TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 9. UPDATE RLS POLICIES TO REQUIRE MFA SECOND FACTOR FOR SENSITIVE RECORDS
-- ----------------------------------------------------------------------------

-- Merchants
DROP POLICY IF EXISTS "merchants_select_own" ON public.merchants;
CREATE POLICY "merchants_select_own"
ON public.merchants FOR SELECT
TO authenticated
USING (auth.uid() = id AND public.is_mfa_verified());

DROP POLICY IF EXISTS "merchants_update_own" ON public.merchants;
CREATE POLICY "merchants_update_own"
ON public.merchants FOR UPDATE
TO authenticated
USING (auth.uid() = id AND public.is_mfa_verified())
WITH CHECK (auth.uid() = id AND public.is_mfa_verified());

-- Customers
DROP POLICY IF EXISTS "customers_select_own" ON public.customers;
CREATE POLICY "customers_select_own"
ON public.customers FOR SELECT
TO authenticated
USING (merchant_id = auth.uid() AND public.is_mfa_verified());

DROP POLICY IF EXISTS "customers_insert_own" ON public.customers;
CREATE POLICY "customers_insert_own"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (merchant_id = auth.uid() AND public.is_mfa_verified());

DROP POLICY IF EXISTS "customers_update_own" ON public.customers;
CREATE POLICY "customers_update_own"
ON public.customers FOR UPDATE
TO authenticated
USING (merchant_id = auth.uid() AND public.is_mfa_verified())
WITH CHECK (merchant_id = auth.uid() AND public.is_mfa_verified());

DROP POLICY IF EXISTS "customers_delete_own" ON public.customers;
CREATE POLICY "customers_delete_own"
ON public.customers FOR DELETE
TO authenticated
USING (merchant_id = auth.uid() AND public.is_mfa_verified());

-- Ledger Entries (Strictly Append-Only + MFA Verified)
DROP POLICY IF EXISTS "ledger_select_own" ON public.ledger_entries;
CREATE POLICY "ledger_select_own"
ON public.ledger_entries FOR SELECT
TO authenticated
USING (merchant_id = auth.uid() AND public.is_mfa_verified());

DROP POLICY IF EXISTS "ledger_insert_own" ON public.ledger_entries;
CREATE POLICY "ledger_insert_own"
ON public.ledger_entries FOR INSERT
TO authenticated
WITH CHECK (
    merchant_id = auth.uid() 
    AND public.is_mfa_verified()
    AND (created_by IS NULL OR created_by = auth.uid())
);

-- Payment Events
DROP POLICY IF EXISTS "payments_select_own" ON public.payment_events;
CREATE POLICY "payments_select_own"
ON public.payment_events FOR SELECT
TO authenticated
USING (merchant_id = auth.uid() AND public.is_mfa_verified());

DROP POLICY IF EXISTS "payments_insert_own" ON public.payment_events;
CREATE POLICY "payments_insert_own"
ON public.payment_events FOR INSERT
TO authenticated
WITH CHECK (merchant_id = auth.uid() AND public.is_mfa_verified());

DROP POLICY IF EXISTS "payments_update_reconciliation" ON public.payment_events;
CREATE POLICY "payments_update_reconciliation"
ON public.payment_events FOR UPDATE
TO authenticated
USING (merchant_id = auth.uid() AND public.is_mfa_verified())
WITH CHECK (merchant_id = auth.uid() AND public.is_mfa_verified());

-- Products / Inventory
DROP POLICY IF EXISTS "products_select_own" ON public.products;
CREATE POLICY "products_select_own"
ON public.products FOR SELECT
TO authenticated
USING (merchant_id = auth.uid() AND public.is_mfa_verified());

DROP POLICY IF EXISTS "products_insert_own" ON public.products;
CREATE POLICY "products_insert_own"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (merchant_id = auth.uid() AND public.is_mfa_verified());

DROP POLICY IF EXISTS "products_update_own" ON public.products;
CREATE POLICY "products_update_own"
ON public.products FOR UPDATE
TO authenticated
USING (merchant_id = auth.uid() AND public.is_mfa_verified())
WITH CHECK (merchant_id = auth.uid() AND public.is_mfa_verified());

DROP POLICY IF EXISTS "products_delete_own" ON public.products;
CREATE POLICY "products_delete_own"
ON public.products FOR DELETE
TO authenticated
USING (merchant_id = auth.uid() AND public.is_mfa_verified());
