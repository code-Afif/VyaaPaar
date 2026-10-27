import { Customer, LedgerEntry, PaymentEvent, InventoryItem, DailyBriefing, VoiceCommandSample } from '@/types';

export const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Ramesh Kumar',
    phone: '+91 98765 43210',
    openingBalancePaise: 20000, // ₹200
    currentBalancePaise: 50000, // ₹500
    totalCreditPaise: 80000,   // ₹800
    totalRepaymentPaise: 30000,// ₹300
    lastActivityDate: 'Today, 11:30 AM',
    createdAt: '2026-10-01',
  },
  {
    id: 'cust-2',
    name: 'Suresh Verma',
    phone: '+91 98112 23344',
    openingBalancePaise: 50000,  // ₹500
    currentBalancePaise: 125000, // ₹1,250
    totalCreditPaise: 175000,   // ₹1,750
    totalRepaymentPaise: 50000, // ₹500
    lastActivityDate: 'Yesterday, 06:15 PM',
    createdAt: '2026-09-15',
  },
  {
    id: 'cust-3',
    name: 'Anita Devi',
    phone: '+91 98998 87766',
    openingBalancePaise: 0,
    currentBalancePaise: 32000,  // ₹320
    totalCreditPaise: 52000,    // ₹520
    totalRepaymentPaise: 20000, // ₹200
    lastActivityDate: '24 Oct, 04:00 PM',
    createdAt: '2026-10-10',
  },
  {
    id: 'cust-4',
    name: 'Vikram Patel (Chai Wala)',
    phone: '+91 97123 45678',
    openingBalancePaise: 0,
    currentBalancePaise: 0,      // ₹0 (Fully settled)
    totalCreditPaise: 90000,    // ₹900
    totalRepaymentPaise: 90000, // ₹900
    lastActivityDate: '23 Oct, 08:30 PM',
    createdAt: '2026-08-20',
  },
  {
    id: 'cust-5',
    name: 'Sunita Mishra',
    phone: '+91 98234 56789',
    openingBalancePaise: 100000, // ₹1,000
    currentBalancePaise: 210000, // ₹2,100
    totalCreditPaise: 260000,   // ₹2,600
    totalRepaymentPaise: 50000, // ₹500
    lastActivityDate: '22 Oct, 02:45 PM',
    createdAt: '2026-07-01',
  },
];

export const SEED_LEDGER_ENTRIES: LedgerEntry[] = [
  {
    id: 'led-1',
    customerId: 'cust-1',
    customerName: 'Ramesh Kumar',
    type: 'CREDIT_SALE',
    amountPaise: 30000, // ₹300
    description: 'Aashirvaad Atta 5kg + Fortune Oil 1L',
    createdAt: 'Today, 11:30 AM',
    source: 'VOICE',
    isSimulated: true,
  },
  {
    id: 'led-2',
    customerId: 'cust-2',
    customerName: 'Suresh Verma',
    type: 'CREDIT_SALE',
    amountPaise: 45000, // ₹450
    description: 'Dairy products & spices',
    createdAt: 'Yesterday, 06:15 PM',
    source: 'MANUAL',
    isSimulated: true,
  },
  {
    id: 'led-3',
    customerId: 'cust-1',
    customerName: 'Ramesh Kumar',
    type: 'REPAYMENT',
    amountPaise: 20000, // ₹200
    description: 'Cash payment received at counter',
    createdAt: 'Yesterday, 02:20 PM',
    source: 'MANUAL',
    isSimulated: true,
  },
  {
    id: 'led-4',
    customerId: 'cust-3',
    customerName: 'Anita Devi',
    type: 'CREDIT_SALE',
    amountPaise: 32000, // ₹320
    description: 'Monthly pulses & sugar',
    createdAt: '24 Oct, 04:00 PM',
    source: 'MANUAL',
    isSimulated: true,
  },
  {
    id: 'led-5',
    customerId: 'cust-4',
    customerName: 'Vikram Patel (Chai Wala)',
    type: 'REPAYMENT',
    amountPaise: 45000, // ₹450
    description: 'UPI payment received via QR',
    createdAt: '23 Oct, 08:30 PM',
    source: 'RECONCILED',
    isSimulated: true,
  },
];

export const SEED_PAYMENT_EVENTS: PaymentEvent[] = [
  {
    id: 'pay-1',
    amountPaise: 50000, // ₹500
    timestamp: 'Today, 12:45 PM',
    referenceNo: 'UPI/329482910481/CR',
    payerName: 'Ramesh Kumar',
    upiId: 'ramesh.k@okhdfcbank',
    status: 'UNMATCHED',
    isSimulated: true,
    suggestedCustomerId: 'cust-1',
    suggestedCustomerName: 'Ramesh Kumar',
    matchReason: 'Payer name matches exactly & amount ₹500 matches total outstanding udhaar.',
    confidence: 0.98,
    channel: 'PAYTM_QR',
  },
  {
    id: 'pay-2',
    amountPaise: 120000, // ₹1,200
    timestamp: 'Today, 10:15 AM',
    referenceNo: 'UPI/329471829012/CR',
    payerName: 'Suresh V',
    upiId: 'suresh.verma@sbi',
    status: 'UNMATCHED',
    isSimulated: true,
    suggestedCustomerId: 'cust-2',
    suggestedCustomerName: 'Suresh Verma',
    matchReason: 'Payer name matches Suresh Verma (₹1,250 Udhaar due). Candidate for partial repayment.',
    confidence: 0.86,
    channel: 'PAYTM_QR',
  },
  {
    id: 'pay-3',
    amountPaise: 35000, // ₹350
    timestamp: 'Today, 09:20 AM',
    referenceNo: 'UPI/329462819001/CR',
    payerName: 'Pooja Singh',
    upiId: 'pooja.s@paytm',
    status: 'UNMATCHED',
    isSimulated: true,
    matchReason: 'No registered customer named Pooja Singh. Likely counter retail sale.',
    confidence: 0.35,
    channel: 'PAYTM_QR',
  },
  {
    id: 'pay-4',
    amountPaise: 45000, // ₹450
    timestamp: 'Yesterday, 08:30 PM',
    referenceNo: 'UPI/329381729011/CR',
    payerName: 'Vikram Patel',
    upiId: 'vikram.chai@icici',
    status: 'RECONCILED',
    isSimulated: true,
    suggestedCustomerId: 'cust-4',
    suggestedCustomerName: 'Vikram Patel (Chai Wala)',
    matchReason: 'Reconciled to Vikram Patel ledger balance.',
    confidence: 1.0,
    reconciledLedgerEntryId: 'led-5',
    channel: 'PAYTM_QR',
  },
];

export const SEED_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    name: 'Aashirvaad Shahi Bhog Atta',
    hindiName: 'आशीर्वाद आटा (10 किग्रा)',
    category: 'Staples & Grains',
    currentStock: 3,
    minStockThreshold: 8,
    unit: 'Bags (10kg)',
    purchasePricePaise: 38000, // ₹380
    sellingPricePaise: 42000,  // ₹420
    isLowStock: true,
    supplierName: 'Agrawal Wholesale Traders',
  },
  {
    id: 'inv-2',
    name: 'Fortune Kachi Ghani Mustard Oil',
    hindiName: 'फॉर्च्यून सरसों तेल (1L)',
    category: 'Edible Oils',
    currentStock: 4,
    minStockThreshold: 10,
    unit: 'Bottles (1L)',
    purchasePricePaise: 13500, // ₹135
    sellingPricePaise: 15500,  // ₹155
    isLowStock: true,
    supplierName: 'National Oil Agency',
  },
  {
    id: 'inv-3',
    name: 'Tata Salt Lite (Iodized)',
    hindiName: 'टाटा नमक (1 किग्रा)',
    category: 'Spices & Condiments',
    currentStock: 22,
    minStockThreshold: 10,
    unit: 'Packets (1kg)',
    purchasePricePaise: 2200,  // ₹22
    sellingPricePaise: 2800,   // ₹28
    isLowStock: false,
    supplierName: 'Agrawal Wholesale Traders',
  },
  {
    id: 'inv-4',
    name: 'Maggi 2-Minute Masala Noodles',
    hindiName: 'मैगी नूडल्स (70g)',
    category: 'Snacks & Instant',
    currentStock: 45,
    minStockThreshold: 15,
    unit: 'Packets',
    purchasePricePaise: 1100,  // ₹11
    sellingPricePaise: 1400,   // ₹14
    isLowStock: false,
    supplierName: 'Delhi FMCG Distributors',
  },
  {
    id: 'inv-5',
    name: 'Amul Pasteurised Butter',
    hindiName: 'अमुल मक्खन (100g)',
    category: 'Dairy',
    currentStock: 2,
    minStockThreshold: 6,
    unit: 'Packs (100g)',
    purchasePricePaise: 5200,  // ₹52
    sellingPricePaise: 5800,   // ₹58
    isLowStock: true,
    supplierName: 'Amul Dairy Booth #12',
  },
];

export const SEED_VOICE_COMMANDS: VoiceCommandSample[] = [
  {
    id: 'vcmd-1',
    hindiText: 'Ramesh ko 300 rupaye ka samaan udhaar likh do',
    englishMeaning: 'Record a ₹300 credit sale for Ramesh',
    intent: 'CREDIT_SALE',
    extractedData: {
      customerName: 'Ramesh Kumar',
      amount: 300,
      description: 'Groceries / samaan',
    },
  },
  {
    id: 'vcmd-2',
    hindiText: 'Ramesh ne aaj 500 rupaye lauta diye',
    englishMeaning: 'Record ₹500 repayment from Ramesh',
    intent: 'REPAYMENT',
    extractedData: {
      customerName: 'Ramesh Kumar',
      amount: 500,
      description: 'Full balance repayment',
    },
  },
  {
    id: 'vcmd-3',
    hindiText: 'Suresh ka total udhaar kitna baaki hai?',
    englishMeaning: 'What is Suresh\'s total outstanding balance?',
    intent: 'SEARCH_BALANCE',
    extractedData: {
      customerName: 'Suresh Verma',
    },
  },
  {
    id: 'vcmd-4',
    hindiText: 'Aaj ki total sale aur payment kitni aayi?',
    englishMeaning: 'What are today\'s total sales and collected payments?',
    intent: 'DAILY_SUMMARY',
    extractedData: {},
  },
];

export const INITIAL_BRIEFING: DailyBriefing = {
  totalSalesPaise: 1485000,    // ₹14,850
  totalCollectedPaise: 920000, // ₹9,200
  totalOutstandingPaise: 417000, // ₹4,170 (Ramesh ₹500 + Suresh ₹1250 + Anita ₹320 + Sunita ₹2100)
  totalExpensesPaise: 85000,   // ₹850 (shop electricity/helper)
  estimatedGrossProfitPaise: 295000, // ₹2,950 (~20% margin)
  lowStockCount: 3,
  topRecommendation: {
    title: 'Suresh Verma Udhaar Follow-up',
    description: 'Suresh Verma has ₹1,250 due for over 12 days. A polite WhatsApp reminder could recover ₹1,200 today.',
    actionText: 'Send WhatsApp Reminder',
    actionRoute: '/customer/cust-2',
  },
  profitLeakAlerts: [
    {
      id: 'leak-1',
      title: 'Low Stock on High Velocity Item',
      description: 'Aashirvaad Atta 10kg has only 3 bags remaining. You may lose ₹1,260 in weekend sales if not restocked.',
      severity: 'ALERT',
      metricImpact: 'Restock before Friday',
    },
    {
      id: 'leak-2',
      title: 'Amul Butter Margin Compressed',
      description: 'Selling at ₹58 with purchase cost ₹52 leaves only 10.3% margin. Local retail benchmark is ₹60.',
      severity: 'WARNING',
      metricImpact: 'Potential ₹150 daily gain',
    },
  ],
};
