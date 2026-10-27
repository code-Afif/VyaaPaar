-- ============================================================================
-- DUKAANSAATHI (VYAAPAAR) - PHASE 2 SEED DATA & REPEATABLE SEED PROCEDURE
-- Populates authentic Kirana store demo data safely scoped to a merchant ID.
-- Does NOT touch internal auth.users system tables.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.seed_merchant_demo_data(p_merchant_id UUID)
RETURNS VOID AS $$
DECLARE
    v_cust1_id UUID;
    v_cust2_id UUID;
    v_cust3_id UUID;
    v_cust4_id UUID;
    v_cust5_id UUID;
BEGIN
    -- 1. Upsert Customers
    INSERT INTO public.customers (id, merchant_id, name, phone)
    VALUES 
        ('00000000-0000-0000-0000-000000000001', p_merchant_id, 'Ramesh Kumar', '+91 98765 43210'),
        ('00000000-0000-0000-0000-000000000002', p_merchant_id, 'Suresh Verma', '+91 98112 23344'),
        ('00000000-0000-0000-0000-000000000003', p_merchant_id, 'Anita Devi', '+91 98998 87766'),
        ('00000000-0000-0000-0000-000000000004', p_merchant_id, 'Vikram Patel (Chai Wala)', '+91 97123 45678'),
        ('00000000-0000-0000-0000-000000000005', p_merchant_id, 'Sunita Mishra', '+91 98234 56789')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone;

    -- 2. Seed Initial Ledger Entries with Idempotency Keys
    INSERT INTO public.ledger_entries (
        id, merchant_id, customer_id, entry_type, amount_paise, description, source, idempotency_key
    )
    VALUES
        (
            '10000000-0000-0000-0000-000000000001',
            p_merchant_id,
            '00000000-0000-0000-0000-000000000001',
            'opening_balance',
            20000,
            'Opening Balance / Purana Udhaar',
            'MANUAL',
            'seed-opening-cust1'
        ),
        (
            '10000000-0000-0000-0000-000000000002',
            p_merchant_id,
            '00000000-0000-0000-0000-000000000001',
            'credit_sale',
            30000,
            'Aashirvaad Atta 5kg + Fortune Oil 1L',
            'VOICE',
            'seed-credit-cust1-1'
        ),
        (
            '10000000-0000-0000-0000-000000000003',
            p_merchant_id,
            '00000000-0000-0000-0000-000000000002',
            'credit_sale',
            125000,
            'Monthly pulses, ghee & spices',
            'MANUAL',
            'seed-credit-cust2-1'
        ),
        (
            '10000000-0000-0000-0000-000000000004',
            p_merchant_id,
            '00000000-0000-0000-0000-000000000003',
            'credit_sale',
            32000,
            'Dairy items & sugar',
            'MANUAL',
            'seed-credit-cust3-1'
        ),
        (
            '10000000-0000-0000-0000-000000000005',
            p_merchant_id,
            '00000000-0000-0000-0000-000000000005',
            'credit_sale',
            210000,
            'Snacks, tea cartons & edible oil',
            'MANUAL',
            'seed-credit-cust5-1'
        )
    ON CONFLICT (id) DO NOTHING;

    -- 3. Seed Simulated Payment Events
    INSERT INTO public.payment_events (
        id,
        merchant_id,
        provider,
        provider_transaction_id,
        amount_paise,
        status,
        is_simulated,
        match_state,
        matched_customer_id,
        payer_name,
        payer_upi,
        match_reason
    )
    VALUES
        (
            '20000000-0000-0000-0000-000000000001',
            p_merchant_id,
            'PAYTM_QR',
            'UPI-329482910481',
            50000,
            'UNMATCHED',
            true,
            'SUGGESTED',
            '00000000-0000-0000-0000-000000000001',
            'Ramesh Kumar',
            'ramesh.k@okhdfcbank',
            'Payer name matches exactly & amount ₹500 matches total outstanding udhaar.'
        ),
        (
            '20000000-0000-0000-0000-000000000002',
            p_merchant_id,
            'PAYTM_QR',
            'UPI-329471829012',
            120000,
            'UNMATCHED',
            true,
            'SUGGESTED',
            '00000000-0000-0000-0000-000000000002',
            'Suresh V',
            'suresh.verma@sbi',
            'Payer name matches Suresh Verma (₹1,250 Udhaar due). Candidate for partial repayment.'
        ),
        (
            '20000000-0000-0000-0000-000000000003',
            p_merchant_id,
            'PAYTM_QR',
            'UPI-329462819001',
            35000,
            'UNMATCHED',
            true,
            'PENDING',
            NULL,
            'Pooja Singh',
            'pooja.s@paytm',
            'No registered customer named Pooja Singh. Likely counter retail sale.'
        )
    ON CONFLICT (merchant_id, provider, provider_transaction_id) DO NOTHING;

    -- 4. Seed Products / Inventory
    INSERT INTO public.products (
        id, merchant_id, name, hindi_name, category, quantity, reorder_threshold, unit, unit_cost_paise, selling_price_paise, supplier_name
    )
    VALUES
        (
            '30000000-0000-0000-0000-000000000001',
            p_merchant_id,
            'Aashirvaad Shahi Bhog Atta',
            'आशीर्वाद आटा (10 किग्रा)',
            'Staples & Grains',
            3,
            8,
            'Bags (10kg)',
            38000,
            42000,
            'Agrawal Wholesale Traders'
        ),
        (
            '30000000-0000-0000-0000-000000000002',
            p_merchant_id,
            'Fortune Kachi Ghani Mustard Oil',
            'फॉर्च्यून सरसों तेल (1L)',
            'Edible Oils',
            4,
            10,
            'Bottles (1L)',
            13500,
            15500,
            'National Oil Agency'
        ),
        (
            '30000000-0000-0000-0000-000000000003',
            p_merchant_id,
            'Tata Salt Lite (Iodized)',
            'टाटा नमक (1 किग्रा)',
            'Spices & Condiments',
            22,
            10,
            'Packets (1kg)',
            2200,
            2800,
            'Agrawal Wholesale Traders'
        ),
        (
            '30000000-0000-0000-0000-000000000004',
            p_merchant_id,
            'Maggi 2-Minute Masala Noodles',
            'मैगी नूडल्स (70g)',
            'Snacks & Instant',
            45,
            15,
            'Packets',
            1100,
            1400,
            'Delhi FMCG Distributors'
        ),
        (
            '30000000-0000-0000-0000-000000000005',
            p_merchant_id,
            'Amul Pasteurised Butter',
            'अमुल मक्खन (100g)',
            'Dairy',
            2,
            6,
            'Packs (100g)',
            5200,
            5800,
            'Amul Dairy Booth #12'
        )
    ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
