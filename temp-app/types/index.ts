export type TransactionType = 'CREDIT_SALE' | 'REPAYMENT' | 'ADJUSTMENT';

export type TransactionSource = 'VOICE' | 'MANUAL' | 'RECONCILED' | 'SIMULATOR';

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  openingBalancePaise: number;
  currentBalancePaise: number; // positive = customer owes shop (udhaar), 0 = settled
  totalCreditPaise: number;
  totalRepaymentPaise: number;
  lastActivityDate: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  customerId: string;
  customerName: string;
  type: TransactionType;
  amountPaise: number;
  description: string;
  createdAt: string;
  paymentEventId?: string;
  isSimulated?: boolean;
  source: TransactionSource;
}

export type PaymentStatus = 'SUCCESS' | 'PENDING' | 'RECONCILED' | 'UNMATCHED' | 'FAILED';

export interface PaymentEvent {
  id: string;
  amountPaise: number;
  timestamp: string;
  referenceNo: string; // e.g. UTR / UPI Ref
  payerName?: string;
  upiId?: string;
  status: PaymentStatus;
  isSimulated: boolean;
  suggestedCustomerId?: string;
  suggestedCustomerName?: string;
  matchReason?: string;
  confidence: number; // 0.0 - 1.0
  reconciledLedgerEntryId?: string;
  channel: 'PAYTM_QR' | 'BHIM_UPI' | 'BANK_TRANSFER' | 'CASH';
}

export interface InventoryItem {
  id: string;
  name: string;
  hindiName?: string;
  category: string;
  currentStock: number;
  minStockThreshold: number;
  unit: string;
  purchasePricePaise: number;
  sellingPricePaise: number;
  isLowStock: boolean;
  supplierName?: string;
}

export interface ProfitLeakAlert {
  id: string;
  title: string;
  description: string;
  severity: 'WARNING' | 'ALERT' | 'INFO';
  metricImpact?: string;
}

export interface DailyBriefing {
  totalSalesPaise: number;
  totalCollectedPaise: number;
  totalOutstandingPaise: number;
  totalExpensesPaise: number;
  estimatedGrossProfitPaise: number;
  lowStockCount: number;
  topRecommendation: {
    title: string;
    description: string;
    actionText: string;
    actionRoute: string;
  };
  profitLeakAlerts: ProfitLeakAlert[];
}

export interface VoiceCommandSample {
  id: string;
  hindiText: string;
  englishMeaning: string;
  intent: 'CREDIT_SALE' | 'REPAYMENT' | 'SEARCH_BALANCE' | 'DAILY_SUMMARY';
  extractedData: {
    customerName?: string;
    amount?: number;
    description?: string;
  };
}
