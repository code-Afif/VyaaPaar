import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Customer, LedgerEntry, PaymentEvent, InventoryItem } from '@/types';

export interface DbMerchant {
  id: string;
  store_name: string;
  owner_name: string;
  phone?: string;
  upi_id?: string;
  preferred_language: string;
}

export const supabaseService = {
  /**
   * Fetch current authenticated merchant's profile
   */
  async getMerchantProfile(userId: string): Promise<DbMerchant | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Error fetching merchant profile:', error.message);
      return null;
    }
    return data;
  },

  /**
   * Ensure merchant profile exists, inserting or updating with provided metadata if needed.
   * Prevents missing or duplicate profiles on login/registration.
   */
  async ensureMerchantProfile(
    userId: string,
    metadata?: {
      store_name?: string;
      owner_name?: string;
      phone?: string;
      upi_id?: string;
      preferred_language?: string;
    }
  ): Promise<DbMerchant | null> {
    if (!isSupabaseConfigured()) return null;

    const existing = await this.getMerchantProfile(userId);
    if (existing) {
      if (
        metadata?.store_name &&
        existing.store_name === 'Kirana Store' &&
        metadata.store_name !== 'Kirana Store'
      ) {
        const { data: updated } = await supabase
          .from('merchants')
          .update({
            store_name: metadata.store_name,
            owner_name: metadata.owner_name || existing.owner_name,
            phone: metadata.phone || existing.phone,
            upi_id: metadata.upi_id || existing.upi_id,
          })
          .eq('id', userId)
          .select()
          .single();
        if (updated) return updated;
      }
      return existing;
    }

    const storeName = metadata?.store_name || 'Sharma General Store';
    const ownerName = metadata?.owner_name || 'Rajesh Sharma';
    const upiId =
      metadata?.upi_id ||
      `${storeName.toLowerCase().replace(/[^a-z0-9]/g, '')}@paytm`;

    const { data: inserted, error } = await supabase
      .from('merchants')
      .upsert(
        {
          id: userId,
          store_name: storeName,
          owner_name: ownerName,
          phone: metadata?.phone || '+91 98260 12345',
          upi_id: upiId,
          preferred_language: metadata?.preferred_language || 'hi',
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) {
      console.warn('Error ensuring merchant profile:', error.message);
      return null;
    }

    return inserted;
  },

  /**
   * Fetch customers and calculate balances deterministically from ledger entries
   */
  async getCustomers(merchantId: string): Promise<Customer[]> {
    if (!isSupabaseConfigured()) return [];

    const { data: dbCustomers, error: custError } = await supabase
      .from('customers')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (custError || !dbCustomers) {
      console.warn('Error fetching customers:', custError?.message);
      return [];
    }

    // Fetch ledger entries to compute exact current balance in integer paise
    const { data: entries } = await supabase
      .from('ledger_entries')
      .select('customer_id, entry_type, amount_paise')
      .eq('merchant_id', merchantId);

    const balanceMap: Record<
      string,
      { balance: number; totalCredit: number; totalRepayment: number }
    > = {};

    entries?.forEach((entry) => {
      if (!entry.customer_id) return;
      if (!balanceMap[entry.customer_id]) {
        balanceMap[entry.customer_id] = {
          balance: 0,
          totalCredit: 0,
          totalRepayment: 0,
        };
      }

      const amount = Number(entry.amount_paise);
      if (
        entry.entry_type === 'credit_sale' ||
        entry.entry_type === 'opening_balance' ||
        entry.entry_type === 'adjustment_debit'
      ) {
        balanceMap[entry.customer_id].balance += amount;
        balanceMap[entry.customer_id].totalCredit += amount;
      } else if (
        entry.entry_type === 'repayment' ||
        entry.entry_type === 'adjustment_credit'
      ) {
        balanceMap[entry.customer_id].balance -= amount;
        balanceMap[entry.customer_id].totalRepayment += amount;
      }
    });

    return dbCustomers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone || undefined,
      openingBalancePaise: 0,
      currentBalancePaise: Math.max(0, balanceMap[c.id]?.balance || 0),
      totalCreditPaise: balanceMap[c.id]?.totalCredit || 0,
      totalRepaymentPaise: balanceMap[c.id]?.totalRepayment || 0,
      lastActivityDate: new Date(c.updated_at || c.created_at).toLocaleDateString(
        'en-IN',
        { day: 'numeric', month: 'short' }
      ),
      createdAt: c.created_at,
    }));
  },

  /**
   * Fetch ledger entries
   */
  async getLedgerEntries(merchantId: string): Promise<LedgerEntry[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('ledger_entries')
      .select('*, customers(name)')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('Error fetching ledger entries:', error?.message);
      return [];
    }

    return data.map((d) => ({
      id: d.id,
      customerId: d.customer_id || '',
      customerName: (d.customers as any)?.name || 'General Expense',
      type: d.entry_type === 'credit_sale' ? 'CREDIT_SALE' : 'REPAYMENT',
      amountPaise: Number(d.amount_paise),
      description: d.description || '',
      createdAt: new Date(d.created_at).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      source: d.source as any,
      isSimulated: false,
    }));
  },

  /**
   * Fetch payment events
   */
  async getPaymentEvents(merchantId: string): Promise<PaymentEvent[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('payment_events')
      .select('*, customers(name)')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('Error fetching payment events:', error?.message);
      return [];
    }

    return data.map((p) => ({
      id: p.id,
      amountPaise: Number(p.amount_paise),
      timestamp: new Date(p.created_at).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      referenceNo: p.provider_transaction_id,
      payerName: p.payer_name || undefined,
      upiId: p.payer_upi || undefined,
      status: p.status as any,
      isSimulated: p.is_simulated,
      suggestedCustomerId: p.matched_customer_id || undefined,
      suggestedCustomerName: (p.customers as any)?.name || undefined,
      matchReason: p.match_reason || undefined,
      confidence: 0.95,
      channel: 'PAYTM_QR',
    }));
  },

  /**
   * Fetch products
   */
  async getProducts(merchantId: string): Promise<InventoryItem[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((prod) => ({
      id: prod.id,
      name: prod.name,
      hindiName: prod.hindi_name || undefined,
      category: prod.category,
      currentStock: prod.quantity,
      minStockThreshold: prod.reorder_threshold,
      unit: prod.unit,
      purchasePricePaise: Number(prod.unit_cost_paise),
      sellingPricePaise: Number(prod.selling_price_paise),
      isLowStock: prod.quantity <= prod.reorder_threshold,
      supplierName: prod.supplier_name || undefined,
    }));
  },

  /**
   * Insert new customer into Supabase
   */
  async createCustomer(
    merchantId: string,
    name: string,
    phone?: string,
    openingBalancePaise: number = 0
  ): Promise<Customer | null> {
    if (!isSupabaseConfigured()) return null;

    const { data: newCust, error } = await supabase
      .from('customers')
      .insert({
        merchant_id: merchantId,
        name: name.trim(),
        phone: phone?.trim(),
      })
      .select()
      .single();

    if (error || !newCust) {
      throw new Error(`Failed to create customer: ${error?.message}`);
    }

    // If opening balance > 0, insert opening_balance ledger entry
    if (openingBalancePaise > 0) {
      await this.recordLedgerEntry({
        merchantId,
        customerId: newCust.id,
        entryType: 'opening_balance',
        amountPaise: openingBalancePaise,
        description: 'Opening Balance (Pichhla Purana Udhaar)',
        source: 'MANUAL',
        idempotencyKey: `opening-${newCust.id}`,
      });
    }

    return {
      id: newCust.id,
      name: newCust.name,
      phone: newCust.phone || undefined,
      openingBalancePaise,
      currentBalancePaise: openingBalancePaise,
      totalCreditPaise: openingBalancePaise,
      totalRepaymentPaise: 0,
      lastActivityDate: 'Just now',
      createdAt: newCust.created_at,
    };
  },

  /**
   * Insert append-only ledger entry with idempotency key
   */
  async recordLedgerEntry(params: {
    merchantId: string;
    customerId?: string;
    entryType: 'credit_sale' | 'repayment' | 'opening_balance' | 'expense';
    amountPaise: number;
    description: string;
    source: 'VOICE' | 'MANUAL' | 'RECONCILED' | 'SIMULATOR';
    idempotencyKey?: string;
  }): Promise<string> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');

    const { data, error } = await supabase
      .from('ledger_entries')
      .insert({
        merchant_id: params.merchantId,
        customer_id: params.customerId || null,
        entry_type: params.entryType,
        amount_paise: params.amountPaise,
        description: params.description,
        source: params.source,
        idempotency_key: params.idempotencyKey,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        console.warn('Idempotency key matched; duplicate insert ignored.');
        return 'idempotent-duplicate';
      }
      throw new Error(`Failed to record ledger entry: ${error.message}`);
    }

    return data.id;
  },

  /**
   * Reconcile payment event with customer ledger
   */
  async reconcilePayment(params: {
    merchantId: string;
    paymentEventId: string;
    customerId: string;
    amountPaise: number;
    referenceNo: string;
  }): Promise<void> {
    if (!isSupabaseConfigured()) return;

    // 1. Record repayment in append-only ledger
    const ledgerEntryId = await this.recordLedgerEntry({
      merchantId: params.merchantId,
      customerId: params.customerId,
      entryType: 'repayment',
      amountPaise: params.amountPaise,
      description: `UPI Payment Reconciled (${params.referenceNo})`,
      source: 'RECONCILED',
      idempotencyKey: `reconcile-${params.paymentEventId}`,
    });

    // 2. Update payment event status
    const { error } = await supabase
      .from('payment_events')
      .update({
        status: 'RECONCILED',
        match_state: 'RECONCILED',
        matched_customer_id: params.customerId,
        reconciled_ledger_entry_id: ledgerEntryId,
      })
      .eq('id', params.paymentEventId)
      .eq('merchant_id', params.merchantId);

    if (error) {
      console.warn('Failed to update payment event status:', error.message);
    }
  },

  /**
   * Safe repeatable seed for newly authenticated merchant
   */
  async seedMerchantDemoData(merchantId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase.rpc('seed_merchant_demo_data', {
      p_merchant_id: merchantId,
    });

    if (error) {
      console.warn('RPC seed error:', error.message);
      return false;
    }
    return true;
  },
};
