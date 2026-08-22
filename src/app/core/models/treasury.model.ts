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
  readonly dueDate: string; // ISO Date String
  readonly paymentDate?: string; // ISO Date String
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
