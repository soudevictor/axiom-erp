export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type TransactionCategory =
  | 'SUPPLIER_PAYMENT'
  | 'CLIENT_RECEIPT'
  | 'LOGISTICS'
  | 'TAXES';

export interface TreasuryTransaction {
  readonly id: string;
  readonly description: string;
  readonly type: TransactionType;
  readonly amount: number;
  readonly category: TransactionCategory;
  readonly partnerId: string;
  readonly partnerName: string;
  readonly status: TransactionStatus;
  readonly dueDate: string;
  readonly paymentDate?: string;
}

export interface TransactionInput {
  readonly description: string;
  readonly type: TransactionType;
  readonly amount: number;
  readonly category: TransactionCategory;
  readonly partnerId: string;
  readonly partnerName: string;
  readonly dueDate: string;
  readonly paymentDate?: string;
}

export interface TreasuryFilter {
  readonly search: string;
  readonly type: TransactionType | 'ALL';
  readonly status: TransactionStatus | 'ALL';
  readonly category: TransactionCategory | 'ALL';
  readonly page: number;
  readonly limit: number;
  readonly sortBy: keyof TreasuryTransaction;
  readonly sortOrder: 'asc' | 'desc';
}

export interface MonthlyCashflow {
  readonly month: string;
  readonly income: number;
  readonly expense: number;
  readonly balance: number;
}

export interface TreasuryAging {
  readonly overdue: readonly TreasuryTransaction[];
  readonly today: readonly TreasuryTransaction[];
  readonly next7: readonly TreasuryTransaction[];
  readonly next30: readonly TreasuryTransaction[];
}

export interface TreasurySummary {
  readonly totalReceivables: number;
  readonly totalPayables: number;
  readonly totalBalance: number;
  readonly totalItems: number;
  readonly aging: TreasuryAging;
  readonly realized: {
    readonly income: number;
    readonly expense: number;
    readonly balance: number;
  };
  readonly monthly: readonly MonthlyCashflow[];
  readonly upcoming30: {
    readonly receivables: number;
    readonly payables: number;
    readonly receivableCount: number;
    readonly payableCount: number;
  };
  readonly lastMonth: {
    readonly income: number;
    readonly expense: number;
    readonly balance: number;
  } | null;
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: 'Receita',
  EXPENSE: 'Despesa',
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  PENDING: 'Pendente',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

export const TRANSACTION_CATEGORY_LABELS: Record<TransactionCategory, string> = {
  SUPPLIER_PAYMENT: 'Fornecedor',
  CLIENT_RECEIPT: 'Recebimento',
  LOGISTICS: 'Logística',
  TAXES: 'Impostos',
};

export const TRANSACTION_CATEGORIES: readonly TransactionCategory[] = [
  'SUPPLIER_PAYMENT',
  'CLIENT_RECEIPT',
  'LOGISTICS',
  'TAXES',
];

export const DEFAULT_TREASURY_FILTER: TreasuryFilter = {
  search: '',
  type: 'ALL',
  status: 'ALL',
  category: 'ALL',
  page: 1,
  limit: 20,
  sortBy: 'dueDate',
  sortOrder: 'asc',
};
