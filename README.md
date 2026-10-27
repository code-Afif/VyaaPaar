# DukaanSaathi (VyaaPaar)
## AI Business Partner for Indian Kirana Shopkeepers & Small Retail Merchants

DukaanSaathi is a mobile-first fintech application designed for Indian merchants to manage customer credit (udhaar), record transactions through natural Hindi/Hinglish voice input, reconcile incoming payments (Paytm Soundbox / UPI QR), understand business performance, and prevent profit leaks.

---

## 📱 Quick Start (Run on Android with Expo Go)

1. Open your terminal in the `temp-app` directory:
   ```bash
   cd temp-app
   ```

2. Start the Expo development server:
   ```bash
   npx expo start
   ```

3. Scan the QR code shown in your terminal using the **Expo Go** app on your Android smartphone.

---

## 🎨 Design System & Palette

- **Primary Blue:** `#00B9F1` (Paytm-inspired high-trust fintech blue)
- **Dark Navy:** `#102A43` (Headers, high-contrast badges)
- **Background:** `#F5F8FC` (Clean, subtle light grayish-blue)
- **White Surfaces:** `#FFFFFF` (Cards, elevated items)
- **Text Primary:** `#172B4D`
- **Text Secondary:** `#66758A`
- **Success Green:** `#00B074` (Collected payments, positive cashflow)
- **Danger Red:** `#E53E3E` (Udhaar due, credit given)
- **Warning Amber:** `#D97706` (Unmatched transactions, low stock alerts)

---

## 🗄️ Supabase Backend, Migrations & RLS Architecture (Phase 2)

All database migrations are stored in reproducible SQL files under [`supabase/migrations/`](file:///c:/Users/Afif/Documents/VyaaPaar%20%28Hackathon%29/VyaaPaar/supabase/migrations):

### 1. Database Schema
- **`public.merchants`**: Store profile, owner name, phone, UPI VPA, preferred language (`id REFERENCES auth.users(id)`).
- **`public.customers`**: Merchant-scoped customers with phone and timestamps.
- **`public.ledger_entries`**: Append-only financial transactions. Types: `credit_sale`, `repayment`, `opening_balance`, `expense`, `adjustment_credit`, `adjustment_debit`. All amounts in positive **BIGINT paise**.
- **`public.payment_events`**: Incoming UPI/Paytm QR payment events. Unique index on `(merchant_id, provider, provider_transaction_id)` prevents double-counting.
- **`public.products`**: Inventory items, quantities, reorder thresholds, and unit costs.

### 2. Financial Integrity & Security Guarantees
- **Strictly Append-Only**: Database trigger `trg_prevent_ledger_update` raises an exception if an `UPDATE` or `DELETE` is attempted on `ledger_entries`. Corrections must use adjustment entries.
- **Idempotency Protection**: Unique index on `(merchant_id, idempotency_key)` protects against duplicate network writes.
- **Deterministic Balances**: PostgreSQL function `calculate_customer_balance(p_customer_id)` sums debits and credits in integer paise without relying on client calculations.
- **Automatic User Onboarding**: Trigger `trg_on_auth_user_created` creates the `merchants` record upon user sign-up in `auth.users`.
- **Row Level Security (RLS)**: Enabled across all tables. Strict multi-tenant isolation where `merchant_id = auth.uid()`. Anon access is explicitly revoked.

### 3. How to Apply Migrations to Your Supabase Project

#### Option A: Via Supabase Dashboard (Recommended for quick evaluation)
1. Go to your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Open the **SQL Editor** in the left sidebar.
3. Copy and run [`supabase/migrations/20261026000001_initial_schema.sql`](file:///c:/Users/Afif/Documents/VyaaPaar%20%28Hackathon%29/VyaaPaar/supabase/migrations/20261026000001_initial_schema.sql).
4. Copy and run [`supabase/migrations/20261026000002_row_level_security.sql`](file:///c:/Users/Afif/Documents/VyaaPaar%20%28Hackathon%29/VyaaPaar/supabase/migrations/20261026000002_row_level_security.sql).
5. Copy and run [`supabase/seed.sql`](file:///c:/Users/Afif/Documents/VyaaPaar%20%28Hackathon%29/VyaaPaar/supabase/seed.sql) to install the safe demo seeding procedure.
6. (Optional) Run [`supabase/tests/rls_tests.sql`](file:///c:/Users/Afif/Documents/VyaaPaar%20%28Hackathon%29/VyaaPaar/supabase/tests/rls_tests.sql) to run the automated test suite.

#### Option B: Via Supabase CLI
```bash
supabase link --project-ref your-project-id
supabase db push
```

---

## 🔑 Environment Variables Setup

Create a `.env.local` inside `temp-app/`:
```bash
# Supabase Configuration (Client-safe publishable keys only)
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_anon_key_here
```

> **Security Note:** Never place your Supabase `service_role` / secret key in the mobile application. The mobile app strictly uses client-safe publishable keys with Row Level Security.

---

## 🧭 Two-Factor Authentication (MFA) & Demo Mode

### 1. Seamless Demo Mode (Active by default)
- If Supabase environment variables are unconfigured or absent, the application launches directly into **Demo Mode** using realistic pre-seeded data for *Sharma General Store*.
- Judges and evaluators can test every feature (Khata ledger, customer balance calculations, Paytm QR payment reconciliation, and inventory tracking) without configuring an external database.

### 2. Password-First, Email OTP Second Architecture
DukaanSaathi secures merchant store records using a strict **two-step authentication flow**:
- **Step A (Credentials Verification):** Traditional email and password authentication using `supabase.auth.signInWithPassword()`. If invalid, generic credential errors are returned and no OTP is ever generated. New merchants register with their store and owner details.
- **Step B (Email OTP Second Factor):** Triggered only upon valid password authentication. The trusted Supabase Edge Function (`mfa-auth`) generates a cryptographically secure 6-digit OTP, stores its SHA-256 hash in `mfa_challenges`, and dispatches it via a configured email provider.
- **Step C (Session-Bound Verification):** The OTP is verified server-side via `verify_mfa_challenge`. Successful verification creates an active record in `mfa_verification_sessions` bound strictly to the caller's JWT `session_id`.
- **Row-Level Security (RLS) Shield:** All 5 merchant tables (`merchants`, `customers`, `ledger_entries`, `payment_events`, `products`) evaluate `public.is_mfa_verified()`, denying all access until second-factor verification completes for that specific session.

### 3. Expiration, Abuse Prevention & Security Guarantees
- **OTP Expiration:** OTP challenges expire after **1 hour** on the server.
- **Attempt Lockout:** Server-enforced maximum of **5 verification attempts** before an OTP challenge is permanently locked.
- **Resend Cooldown:** Server-side and client-side **60-second cooldown** between challenge requests.
- **Single-Use:** Challenges are marked `consumed_at` immediately upon successful verification to prevent replay attacks.
- **Fail-Closed Execution:** If the Edge Function or email provider is unavailable, verification fails closed with an explicit error. OTP codes are never exposed in responses or logs.

---

## 🔒 Financial Integrity Rules

- All monetary calculations are performed in **integer paise** (`paise = rupees * 100`) to eliminate floating-point rounding errors.
- Balances are calculated deterministically from transaction records rather than generated by LLM estimations.
- Payment events are labeled with clear **SIMULATED EVENT** badges for transparent hackathon demonstration.