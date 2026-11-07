import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';
import {
  Customer,
  LedgerEntry,
  PaymentEvent,
  InventoryItem,
  DailyBriefing,
  TransactionSource,
} from '@/types';
import {
  SEED_CUSTOMERS,
  SEED_LEDGER_ENTRIES,
  SEED_PAYMENT_EVENTS,
  SEED_INVENTORY,
  INITIAL_BRIEFING,
} from '@/data/seedData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { supabaseService } from '@/services/supabaseService';

export interface MerchantProfile {
  id?: string;
  storeName: string;
  merchantName: string;
  upiId: string;
  phone: string;
  city: string;
  isDemoMode: boolean;
}

interface AppContextType {
  merchant: MerchantProfile;
  customers: Customer[];
  ledgerEntries: LedgerEntry[];
  paymentEvents: PaymentEvent[];
  inventory: InventoryItem[];
  briefing: DailyBriefing;
  isLoading: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  setDemoMode: (isDemo: boolean) => void;
  signOut: () => Promise<void>;
  completeLogin: (userId: string, metadata?: any) => Promise<void>;
  seedCurrentSupabaseAccount: () => Promise<boolean>;
  addCustomer: (
    name: string,
    phone?: string,
    openingBalancePaise?: number,
    customId?: string
  ) => Promise<Customer>;
  updateCustomer: (
    customerId: string,
    name: string,
    phone?: string
  ) => Promise<Customer>;
  recordCreditSale: (
    customerId: string,
    amountPaise: number,
    description: string,
    source?: TransactionSource
  ) => Promise<LedgerEntry>;
  recordRepayment: (
    customerId: string,
    amountPaise: number,
    description: string,
    source?: TransactionSource,
    paymentEventId?: string
  ) => Promise<LedgerEntry>;
  reconcilePayment: (paymentEventId: string, customerId: string) => Promise<void>;
  simulateIncomingPayment: (amountPaise?: number, payerName?: string) => PaymentEvent;
  getCustomerById: (id: string) => Customer | undefined;
  getCustomerLedger: (customerId: string) => LedgerEntry[];
  resetToDemoSeed: () => void;
  refreshFromSupabase: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [merchant, setMerchant] = useState<MerchantProfile>({
    storeName: 'Sharma General Store',
    merchantName: 'Rajesh Sharma',
    upiId: 'sharma.kirana@paytm',
    phone: '+91 98260 12345',
    city: 'Indore, MP',
    isDemoMode: true,
  });

  const [customers, setCustomers] = useState<Customer[]>(SEED_CUSTOMERS);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(SEED_LEDGER_ENTRIES);
  const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>(SEED_PAYMENT_EVENTS);
  const [inventory, setInventory] = useState<InventoryItem[]>(SEED_INVENTORY);

  // Restore authenticated session on launch
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      if (!isSupabaseConfigured()) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (data.session && isMounted) {
          setIsAuthenticated(true);
          setUserEmail(data.session.user.email || null);
          setIsDemoMode(false);
          await loadSupabaseData(data.session.user.id, data.session.user.user_metadata);
        }
      } catch (err) {
        console.warn('Session restoration failed:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initSession();

    // Listen to Auth State Changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUserEmail(session.user.email || null);
          setIsAuthenticated(true);
          setIsDemoMode(false);
          await loadSupabaseData(session.user.id, session.user.user_metadata);
        } else {
          setIsAuthenticated(false);
          setUserEmail(null);
          setIsDemoMode(true);
          resetToDemoSeed();
        }
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const loadSupabaseData = async (userId: string, metadata?: any) => {
    try {
      const profile = await supabaseService.ensureMerchantProfile(userId, metadata);
      setMerchant({
        id: userId,
        storeName: profile?.store_name || metadata?.store_name || 'Sharma General Store',
        merchantName: profile?.owner_name || metadata?.owner_name || 'Rajesh Sharma',
        phone: profile?.phone || metadata?.phone || '+91 98260 12345',
        upiId: profile?.upi_id || metadata?.upi_id || 'sharma.kirana@paytm',
        city: 'Verified Merchant',
        isDemoMode: false,
      });

      const [dbCusts, dbLedger, dbPayments, dbProducts] = await Promise.all([
        supabaseService.getCustomers(userId),
        supabaseService.getLedgerEntries(userId),
        supabaseService.getPaymentEvents(userId),
        supabaseService.getProducts(userId),
      ]);

      // Deduplicate customers by ID
      const seen = new Set<string>();
      const uniqueCusts: Customer[] = [];
      for (const c of dbCusts) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          uniqueCusts.push(c);
        }
      }
      setCustomers(uniqueCusts);
      setLedgerEntries(dbLedger);
      setPaymentEvents(dbPayments);
      setInventory(dbProducts);

      if (__DEV__) {
        console.log(`[AppContext] Loaded ${uniqueCusts.length} merchant customers (Unique IDs: ${uniqueCusts.length})`);
      }
    } catch (err) {
      console.warn('Error loading Supabase merchant data:', err);
    }
  };

  const completeLogin = async (userId: string, metadata?: any) => {
    setIsAuthenticated(true);
    setIsDemoMode(false);
    await loadSupabaseData(userId, metadata);
  };

  const refreshFromSupabase = async () => {
    if (merchant.id && !isDemoMode) {
      await loadSupabaseData(merchant.id);
    }
  };

  // Recalculate deterministic stats
  const totalOutstandingPaise = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.currentBalancePaise, 0);
  }, [customers]);

  const totalCollectedTodayPaise = useMemo(() => {
    return ledgerEntries
      .filter((l) => l.type === 'REPAYMENT' && (l.createdAt.includes('Today') || l.createdAt.includes('Just now')))
      .reduce((sum, l) => sum + l.amountPaise, 920000);
  }, [ledgerEntries]);

  const totalSalesTodayPaise = useMemo(() => {
    return ledgerEntries
      .filter((l) => l.type === 'CREDIT_SALE' && (l.createdAt.includes('Today') || l.createdAt.includes('Just now')))
      .reduce((sum, l) => sum + l.amountPaise, 1485000);
  }, [ledgerEntries]);

  const briefing: DailyBriefing = useMemo(() => {
    return {
      ...INITIAL_BRIEFING,
      totalOutstandingPaise,
      totalCollectedPaise: totalCollectedTodayPaise,
      totalSalesPaise: totalSalesTodayPaise,
    };
  }, [totalOutstandingPaise, totalCollectedTodayPaise, totalSalesTodayPaise]);

  const setDemoMode = (demo: boolean) => {
    setIsDemoMode(demo);
    if (demo) {
      resetToDemoSeed();
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
    setUserEmail(null);
    setIsDemoMode(true);
    resetToDemoSeed();
  };

  const seedCurrentSupabaseAccount = async (): Promise<boolean> => {
    if (!merchant.id || isDemoMode) return false;
    const ok = await supabaseService.seedMerchantDemoData(merchant.id);
    if (ok) {
      await refreshFromSupabase();
    }
    return ok;
  };

  const addCustomer = async (
    name: string,
    phone?: string,
    openingBalancePaise: number = 0,
    customId?: string
  ): Promise<Customer> => {
    if (!isDemoMode && merchant.id && isSupabaseConfigured()) {
      const created = await supabaseService.createCustomer(
        merchant.id,
        name,
        phone,
        openingBalancePaise,
        customId
      );
      if (created) {
        setCustomers((prev) => {
          if (prev.some((c) => c.id === created.id)) return prev;
          return [created, ...prev];
        });
        await refreshFromSupabase();
        return created;
      }
    }

    const newCust: Customer = {
      id: customId || `cust-${Date.now()}`,
      name: name.trim(),
      phone: phone?.trim(),
      openingBalancePaise,
      currentBalancePaise: openingBalancePaise,
      totalCreditPaise: openingBalancePaise,
      totalRepaymentPaise: 0,
      lastActivityDate: 'Just now',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setCustomers((prev) => {
      if (prev.some((c) => c.id === newCust.id)) return prev;
      return [newCust, ...prev];
    });

    if (openingBalancePaise > 0) {
      const openingEntryId = `led-${newCust.id}`;
      setLedgerEntries((prev) => {
        if (prev.some((l) => l.id === openingEntryId)) return prev;
        const openingEntry: LedgerEntry = {
          id: openingEntryId,
          customerId: newCust.id,
          customerName: newCust.name,
          type: 'CREDIT_SALE',
          amountPaise: openingBalancePaise,
          description: 'Opening Balance (Pichhla Purana Udhaar)',
          createdAt: 'Just now',
          source: 'MANUAL',
          isSimulated: true,
        };
        return [openingEntry, ...prev];
      });
    }

    return newCust;
  };

  const updateCustomer = async (
    customerId: string,
    name: string,
    phone?: string
  ): Promise<Customer> => {
    const trimmedName = name.trim();
    const cleanPhone = phone ? phone.replace(/[^0-9+]/g, '').trim() : undefined;

    if (!isDemoMode && merchant.id && isSupabaseConfigured()) {
      await supabaseService.updateCustomer({
        merchantId: merchant.id,
        customerId,
        name: trimmedName,
        phone: cleanPhone,
      });
    }

    let updatedCust: Customer | undefined;

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          updatedCust = {
            ...c,
            name: trimmedName,
            phone: cleanPhone || undefined,
            lastActivityDate: 'Just now',
          };
          return updatedCust;
        }
        return c;
      })
    );

    // Also update customer name on related ledger entries in memory
    setLedgerEntries((prev) =>
      prev.map((l) =>
        l.customerId === customerId ? { ...l, customerName: trimmedName } : l
      )
    );

    if (!updatedCust) {
      const existing = customers.find((c) => c.id === customerId);
      if (!existing) throw new Error('Customer not found');
      updatedCust = {
        ...existing,
        name: trimmedName,
        phone: cleanPhone || undefined,
      };
    }

    return updatedCust;
  };

  const recordCreditSale = async (
    customerId: string,
    amountPaise: number,
    description: string,
    source: TransactionSource = 'MANUAL'
  ): Promise<LedgerEntry> => {
    const customer = customers.find((c) => c.id === customerId);
    const customerName = customer ? customer.name : 'Unknown Customer';
    const idempotencyKey = `sale-${customerId}-${Date.now()}`;

    if (!isDemoMode && merchant.id && isSupabaseConfigured()) {
      await supabaseService.recordLedgerEntry({
        merchantId: merchant.id,
        customerId,
        entryType: 'credit_sale',
        amountPaise,
        description: description.trim() || 'Credit sale',
        source,
        idempotencyKey,
      });
      await refreshFromSupabase();
    }

    const newEntry: LedgerEntry = {
      id: `led-${Date.now()}`,
      customerId,
      customerName,
      type: 'CREDIT_SALE',
      amountPaise,
      description: description.trim() || 'Groceries / Kirana samaan',
      createdAt: 'Today, Just now',
      source,
      isSimulated: isDemoMode,
    };

    setLedgerEntries((prev) => [newEntry, ...prev]);

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          return {
            ...c,
            currentBalancePaise: c.currentBalancePaise + amountPaise,
            totalCreditPaise: c.totalCreditPaise + amountPaise,
            lastActivityDate: 'Today, Just now',
          };
        }
        return c;
      })
    );

    return newEntry;
  };

  const recordRepayment = async (
    customerId: string,
    amountPaise: number,
    description: string,
    source: TransactionSource = 'MANUAL',
    paymentEventId?: string
  ): Promise<LedgerEntry> => {
    const customer = customers.find((c) => c.id === customerId);
    const customerName = customer ? customer.name : 'Unknown Customer';
    const idempotencyKey = `repay-${customerId}-${Date.now()}`;

    if (!isDemoMode && merchant.id && isSupabaseConfigured()) {
      await supabaseService.recordLedgerEntry({
        merchantId: merchant.id,
        customerId,
        entryType: 'repayment',
        amountPaise,
        description: description.trim() || 'Repayment',
        source,
        idempotencyKey,
      });
      await refreshFromSupabase();
    }

    const newEntry: LedgerEntry = {
      id: `led-${Date.now()}`,
      customerId,
      customerName,
      type: 'REPAYMENT',
      amountPaise,
      description: description.trim() || 'Repayment / Jama kiya',
      createdAt: 'Today, Just now',
      source,
      paymentEventId,
      isSimulated: isDemoMode,
    };

    setLedgerEntries((prev) => [newEntry, ...prev]);

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const newBalance = Math.max(0, c.currentBalancePaise - amountPaise);
          return {
            ...c,
            currentBalancePaise: newBalance,
            totalRepaymentPaise: c.totalRepaymentPaise + amountPaise,
            lastActivityDate: 'Today, Just now',
          };
        }
        return c;
      })
    );

    return newEntry;
  };

  const reconcilePayment = async (paymentEventId: string, customerId: string) => {
    const payment = paymentEvents.find((p) => p.id === paymentEventId);
    if (!payment || payment.status === 'RECONCILED') return;

    if (!isDemoMode && merchant.id && isSupabaseConfigured()) {
      await supabaseService.reconcilePayment({
        merchantId: merchant.id,
        paymentEventId,
        customerId,
        amountPaise: payment.amountPaise,
        referenceNo: payment.referenceNo,
      });
      await refreshFromSupabase();
      return;
    }

    const entry = await recordRepayment(
      customerId,
      payment.amountPaise,
      `UPI Payment (${payment.referenceNo}) - Reconciled`,
      'RECONCILED',
      paymentEventId
    );

    setPaymentEvents((prev) =>
      prev.map((p) => {
        if (p.id === paymentEventId) {
          return {
            ...p,
            status: 'RECONCILED',
            reconciledLedgerEntryId: entry.id,
            suggestedCustomerId: customerId,
          };
        }
        return p;
      })
    );
  };

  const simulateIncomingPayment = (
    amountPaise: number = 50000,
    payerName: string = 'Ramesh Kumar'
  ): PaymentEvent => {
    const candidate = customers.find((c) =>
      c.name.toLowerCase().includes(payerName.toLowerCase())
    );

    const newPayment: PaymentEvent = {
      id: `pay-${Date.now()}`,
      amountPaise,
      timestamp: 'Today, Just now',
      referenceNo: `UPI/${Math.floor(100000000000 + Math.random() * 900000000000)}/CR`,
      payerName,
      upiId: `${payerName.toLowerCase().replace(/\s+/g, '.')}@upi`,
      status: 'UNMATCHED',
      isSimulated: true,
      suggestedCustomerId: candidate?.id,
      suggestedCustomerName: candidate?.name,
      matchReason: candidate
        ? `Payer name matches registered customer ${candidate.name} (Outstanding Udhaar: ₹${candidate.currentBalancePaise / 100}).`
        : 'Unknown customer. Candidate for counter retail sale.',
      confidence: candidate ? 0.95 : 0.4,
      channel: 'PAYTM_QR',
    };

    setPaymentEvents((prev) => [newPayment, ...prev]);
    return newPayment;
  };

  const getCustomerById = (id: string) => customers.find((c) => c.id === id);

  const getCustomerLedger = (customerId: string) =>
    ledgerEntries.filter((l) => l.customerId === customerId);

  const resetToDemoSeed = () => {
    setMerchant({
      storeName: 'Sharma General Store',
      merchantName: 'Rajesh Sharma',
      upiId: 'sharma.kirana@paytm',
      phone: '+91 98260 12345',
      city: 'Indore, MP',
      isDemoMode: true,
    });
    setCustomers(SEED_CUSTOMERS);
    setLedgerEntries(SEED_LEDGER_ENTRIES);
    setPaymentEvents(SEED_PAYMENT_EVENTS);
    setInventory(SEED_INVENTORY);
  };

  return (
    <AppContext.Provider
      value={{
        merchant,
        customers,
        ledgerEntries,
        paymentEvents,
        inventory,
        briefing,
        isLoading,
        isAuthenticated,
        userEmail,
        setDemoMode,
        signOut,
        completeLogin,
        seedCurrentSupabaseAccount,
        addCustomer,
        updateCustomer,
        recordCreditSale,
        recordRepayment,
        reconcilePayment,
        simulateIncomingPayment,
        getCustomerById,
        getCustomerLedger,
        resetToDemoSeed,
        refreshFromSupabase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
