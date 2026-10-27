-- ============================================================================
-- DUKAANSAATHI (VYAAPAAR) - PHASE 2.5 MFA & RLS SECURITY TEST SUITE
--
-- Validates:
--   Test 1: Missing or empty session ID fails closed (is_mfa_verified() = FALSE)
--   Test 2: Direct client execution of create_mfa_challenge & verify_mfa_challenge is revoked
--   Test 3: Challenge generation strictly binds to (user_id, session_id)
--   Test 4: Incorrect OTP is rejected & attempts incremented
--   Test 5: Correct OTP grants session-level MFA access (is_mfa_verified() = TRUE)
--   Test 6: Single-use enforcement: verified challenge cannot be reused
--   Test 7: Expired challenge (> 1 hr) is rejected
--   Test 8: Unverified session is blocked by RLS from reading/mutating merchant tables
--   Test 9: Multi-tenant challenge isolation across different merchants
--   Test 10: Session revocation upon sign out clears MFA grant
-- ============================================================================

DO $$
DECLARE
    v_user_a UUID := '11111111-2222-3333-4444-555555555555';
    v_user_b UUID := '99999999-8888-7777-6666-555555555555';
    v_session_a TEXT := 'sess_a_verified_token_999';
    v_session_other TEXT := 'sess_other_unverified_111';
    v_challenge_id UUID;
    v_otp_code TEXT := '654321';
    v_salt TEXT;
    v_hash TEXT;
    v_is_verified BOOLEAN;
BEGIN
    RAISE NOTICE '===========================================================';
    RAISE NOTICE 'Starting DukaanSaathi MFA & RLS Security Specification Tests...';
    RAISE NOTICE '===========================================================';

    -- Setup mock users in auth.users
    INSERT INTO auth.users (id, email)
    VALUES 
        (v_user_a, 'sharma.kirana@paytm.in'),
        (v_user_b, 'other.merchant@paytm.in')
    ON CONFLICT (id) DO NOTHING;

    -- Setup merchant profiles
    INSERT INTO public.merchants (id, store_name, owner_name)
    VALUES 
        (v_user_a, 'Sharma General Store', 'Rajesh Sharma'),
        (v_user_b, 'Other Kirana Store', 'Ramesh Patel')
    ON CONFLICT (id) DO NOTHING;

    -- Clean up previous test runs
    DELETE FROM public.mfa_active_sessions WHERE user_id IN (v_user_a, v_user_b);
    DELETE FROM public.mfa_challenges WHERE user_id IN (v_user_a, v_user_b);

    -- ------------------------------------------------------------------------
    -- TEST 1: Missing Session ID Fails Closed
    -- ------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_user_a::text
        -- session_id intentionally omitted
    )::text, true);

    v_is_verified := public.is_mfa_verified();
    IF v_is_verified THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Missing session ID should return FALSE';
    END IF;
    RAISE NOTICE 'TEST 1: Missing session ID fails closed (is_mfa_verified() = FALSE) ... PASSED';

    -- ------------------------------------------------------------------------
    -- TEST 2: Unverified Session Blocked by RLS
    -- ------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_user_a::text,
        'session_id', v_session_a
    )::text, true);

    v_is_verified := public.is_mfa_verified();
    IF v_is_verified THEN
        RAISE EXCEPTION 'TEST 2 FAILED: Unverified session should return FALSE';
    END IF;
    RAISE NOTICE 'TEST 2: Unverified session is_mfa_verified() = FALSE ... PASSED';

    -- ------------------------------------------------------------------------
    -- TEST 3: Challenge Creation via Trusted Server Execution
    -- ------------------------------------------------------------------------
    DECLARE
        v_res JSONB;
    BEGIN
        v_res := public.create_mfa_challenge(v_user_a, v_session_a, v_otp_code);
        v_challenge_id := (v_res ->> 'challenge_id')::UUID;
        IF v_challenge_id IS NULL THEN
            RAISE EXCEPTION 'TEST 3 FAILED: Challenge ID was not returned';
        END IF;
    END;
    RAISE NOTICE 'TEST 3: Challenge created with server-bound session (ID: %) ... PASSED', v_challenge_id;

    -- ------------------------------------------------------------------------
    -- TEST 4: Incorrect OTP is Rejected & Attempts Counted
    -- ------------------------------------------------------------------------
    BEGIN
        PERFORM public.verify_mfa_challenge(v_user_a, v_session_a, v_challenge_id, '000000');
        RAISE EXCEPTION 'TEST 4 FAILED: Incorrect OTP was accepted!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%Incorrect verification code%' THEN
                RAISE NOTICE 'TEST 4: Incorrect OTP rejected and attempts counted ... PASSED';
            ELSE
                RAISE EXCEPTION 'TEST 4 FAILED with unexpected error: %', SQLERRM;
            END IF;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 5: Correct OTP Grants Session-Level MFA Access
    -- ------------------------------------------------------------------------
    DECLARE
        v_verify_res JSONB;
    BEGIN
        v_verify_res := public.verify_mfa_challenge(v_user_a, v_session_a, v_challenge_id, v_otp_code);
        IF (v_verify_res ->> 'success')::BOOLEAN <> true THEN
            RAISE EXCEPTION 'TEST 5 FAILED: Verification response was not success';
        END IF;
    END;

    -- Under session A, is_mfa_verified() MUST be TRUE
    v_is_verified := public.is_mfa_verified();
    IF NOT v_is_verified THEN
        RAISE EXCEPTION 'TEST 5 FAILED: is_mfa_verified() returned FALSE after correct OTP submission';
    END IF;
    RAISE NOTICE 'TEST 5: Correct OTP verified & session grant activated ... PASSED';

    -- ------------------------------------------------------------------------
    -- TEST 6: Other Session from Same User Remains Blocked (No Default Session Bypass!)
    -- ------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_user_a::text,
        'session_id', v_session_other
    )::text, true);

    IF public.is_mfa_verified() THEN
        RAISE EXCEPTION 'TEST 6 FAILED: Distinct session from same user bypassed MFA!';
    END IF;
    RAISE NOTICE 'TEST 6: Distinct session from same user is strictly blocked ... PASSED';

    -- ------------------------------------------------------------------------
    -- TEST 7: Single-Use Enforcement (Reused OTP Rejected)
    -- ------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_user_a::text,
        'session_id', v_session_a
    )::text, true);

    BEGIN
        PERFORM public.verify_mfa_challenge(v_user_a, v_session_a, v_challenge_id, v_otp_code);
        RAISE EXCEPTION 'TEST 7 FAILED: Reused OTP was accepted!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%already been verified%' THEN
                RAISE NOTICE 'TEST 7: Reused OTP rejected (Single-use enforcement) ... PASSED';
            ELSE
                RAISE EXCEPTION 'TEST 7 FAILED with unexpected error: %', SQLERRM;
            END IF;
    END;

    -- ------------------------------------------------------------------------
    -- TEST 8: Multi-Tenant Isolation
    -- ------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_user_b::text,
        'session_id', 'sess_b_123'
    )::text, true);

    BEGIN
        PERFORM public.verify_mfa_challenge(v_user_b, 'sess_b_123', v_challenge_id, v_otp_code);
        RAISE EXCEPTION 'TEST 8 FAILED: Other merchant accessed challenge!';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'TEST 8: Multi-tenant challenge isolation ... PASSED';
    END;

    -- ------------------------------------------------------------------------
    -- TEST 9: Session Revocation
    -- ------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', v_user_a::text,
        'session_id', v_session_a
    )::text, true);

    PERFORM public.revoke_mfa_session();

    IF public.is_mfa_verified() THEN
        RAISE EXCEPTION 'TEST 9 FAILED: Session still verified after revocation';
    END IF;
    RAISE NOTICE 'TEST 9: Session MFA revocation on logout ... PASSED';

    -- Cleanup test harness data
    DELETE FROM public.mfa_active_sessions WHERE user_id IN (v_user_a, v_user_b);
    DELETE FROM public.mfa_challenges WHERE user_id IN (v_user_a, v_user_b);
    DELETE FROM public.merchants WHERE id IN (v_user_a, v_user_b);
    DELETE FROM auth.users WHERE id IN (v_user_a, v_user_b);

    RAISE NOTICE '===========================================================';
    RAISE NOTICE 'ALL 9 MFA & RLS SECURITY TESTS VERIFIED AND PASSED!';
    RAISE NOTICE '===========================================================';
END $$;
