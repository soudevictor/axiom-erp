import type { B2BPartner } from '@/core/models/partner.model';
import type {
  TransactionCategory,
  TransactionType,
  TreasuryTransaction,
} from '@/core/models/treasury.model';
import {
  EXPENSE_DESCRIPTIONS,
  INCOME_DESCRIPTIONS,
  SEED,
  SEED_TRANSACTION_COUNT,
} from './catalog';
import { int, mulberry32, pick, roundMoney } from './prng';

const DAY = 86_400_000;
const MONTHS = 6;

function isoAt(date: Date): string {
  return date.toISOString();
}

function addDays(now: Date, days: number): Date {
  return new Date(now.getTime() + days * DAY);
}

function monthDate(now: Date, offset: number, day: number): Date {
  const base = new Date(now.getFullYear(), now.getMonth() + offset, 1, 12, 0, 0, 0);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(Math.max(1, day), lastDay);
  return new Date(base.getFullYear(), base.getMonth(), safeDay, 12, 0, 0, 0);
}

function partnerForType(
  rng: () => number,
  partners: readonly B2BPartner[],
  type: TransactionType
): B2BPartner {
  const preferred = partners.filter((partner) =>
    type === 'INCOME'
      ? partner.category === 'CLIENTE_DIRETO' || partner.category === 'DISTRIBUIDOR'
      : partner.category === 'FORNECEDOR' || partner.category === 'DISTRIBUIDOR'
  );
  const pool = preferred.length > 0 ? preferred : partners;
  return pick(rng, pool);
}

export function buildTransactions(
  now: Date = new Date(),
  partners: readonly B2BPartner[],
  seed = SEED
): TreasuryTransaction[] {
  const rng = mulberry32(seed ^ 0x5f3759df);
  const transactions: TreasuryTransaction[] = [];
  let sequence = 0;

  if (partners.length === 0) return transactions;

  const nextId = (): string => {
    sequence += 1;
    return `TX-${String(sequence).padStart(4, '0')}`;
  };

  const expenseCategories: readonly TransactionCategory[] = [
    'SUPPLIER_PAYMENT',
    'LOGISTICS',
    'TAXES',
  ];

  // 84 completed: 7 income + 7 expense per month, for six months.
  for (let offset = -MONTHS + 1; offset <= 0; offset += 1) {
    const currentMonthMaxDay = offset === 0 ? Math.max(1, now.getDate() - 1) : 27;
    for (let slot = 0; slot < 14; slot += 1) {
      const type: TransactionType = slot < 7 ? 'INCOME' : 'EXPENSE';
      const day = Math.min(currentMonthMaxDay, 2 + ((slot * 3) % 25));
      const paymentDate = monthDate(now, offset, day);
      const dueDate = new Date(paymentDate.getTime() - 3 * DAY);
      const partner = partnerForType(rng, partners, type);
      const amount =
        type === 'INCOME'
          ? roundMoney(70_000 + rng() * 100_000)
          : roundMoney(60_000 + rng() * 75_000);
      const category: TransactionCategory =
        type === 'INCOME' ? 'CLIENT_RECEIPT' : pick(rng, expenseCategories);
      const descriptions = type === 'INCOME' ? INCOME_DESCRIPTIONS : EXPENSE_DESCRIPTIONS.EXPENSE;
      const id = nextId();

      transactions.push({
        id,
        description: `${pick(rng, descriptions)} #${1000 + sequence}`,
        type,
        amount,
        category,
        partnerId: partner.id,
        partnerName: partner.companyName,
        status: 'COMPLETED',
        dueDate: isoAt(dueDate),
        paymentDate: isoAt(paymentDate),
      });
    }
  }

  // 30 pending: 8 overdue (actionable) and 22 across the next two months.
  for (let index = 0; index < 30; index += 1) {
    const type: TransactionType = index % 2 === 0 ? 'INCOME' : 'EXPENSE';
    const partner = partnerForType(rng, partners, type);
    const isOverdue = index < 8;
    const days = isOverdue ? -int(rng, 1, 12) : int(rng, 1, 60);
    const dueDate = addDays(now, days);
    dueDate.setHours(12, 0, 0, 0);
    const amount = roundMoney(
      type === 'INCOME' ? 20_000 + rng() * 100_000 : 15_000 + rng() * 75_000
    );
    const category: TransactionCategory =
      type === 'INCOME' ? 'CLIENT_RECEIPT' : pick(rng, expenseCategories);
    const descriptions = type === 'INCOME' ? INCOME_DESCRIPTIONS : EXPENSE_DESCRIPTIONS.EXPENSE;
    const id = nextId();

    transactions.push({
      id,
      description: `${pick(rng, descriptions)} #${1000 + sequence}`,
      type,
      amount,
      category,
      partnerId: partner.id,
      partnerName: partner.companyName,
      status: 'PENDING',
      dueDate: isoAt(dueDate),
    });
  }

  // 6 cancelled, kept out of every realized or upcoming aggregate.
  for (let index = 0; index < 6; index += 1) {
    const type: TransactionType = index % 2 === 0 ? 'INCOME' : 'EXPENSE';
    const partner = partnerForType(rng, partners, type);
    const dueDate = addDays(now, -int(rng, 20, 120));
    dueDate.setHours(12, 0, 0, 0);
    const amount = roundMoney(
      type === 'INCOME' ? 15_000 + rng() * 80_000 : 10_000 + rng() * 60_000
    );
    const category: TransactionCategory =
      type === 'INCOME' ? 'CLIENT_RECEIPT' : pick(rng, expenseCategories);
    const descriptions = type === 'INCOME' ? INCOME_DESCRIPTIONS : EXPENSE_DESCRIPTIONS.EXPENSE;
    const id = nextId();

    transactions.push({
      id,
      description: `${pick(rng, descriptions)} #${1000 + sequence}`,
      type,
      amount,
      category,
      partnerId: partner.id,
      partnerName: partner.companyName,
      status: 'CANCELLED',
      dueDate: isoAt(dueDate),
    });
  }

  return transactions;
}

export const TRANSACTION_SEED_COUNT = SEED_TRANSACTION_COUNT;
