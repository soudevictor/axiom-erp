import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { TreasuryStore } from './treasury.store';
import { mockApiInterceptor } from '@/core/interceptors/mock-api.interceptor';
import { db } from '@/core/database/app-database';
import type { TreasuryTransaction } from '@/core/models/treasury.model';

function createMockTx(overrides: Partial<TreasuryTransaction> = {}): TreasuryTransaction {
  return {
    id: crypto.randomUUID(),
    description: 'Teste Recebimento Fatura',
    type: 'INCOME',
    amount: 10000,
    category: 'CLIENT_RECEIPT',
    partnerId: 'PART-001',
    partnerName: 'TechSupply Brasil Distribuidora Ltda',
    status: 'COMPLETED',
    dueDate: new Date().toISOString(),
    ...overrides,
  };
}

async function seedTransactions(items: TreasuryTransaction[]): Promise<void> {
  await db.transactions.bulkAdd(items);
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 500));
}

describe('TreasuryStore', () => {
  let store: InstanceType<typeof TreasuryStore>;

  beforeEach(async () => {
    await db.transactions.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mockApiInterceptor])),
        TreasuryStore,
      ],
    });
  });

  afterEach(async () => {
    await db.transactions.clear();
  });

  describe('Estado Inicial', () => {
    it('deve carregar transações automaticamente via onInit', async () => {
      await seedTransactions([createMockTx(), createMockTx({ type: 'EXPENSE', amount: 3000 })]);

      store = TestBed.inject(TreasuryStore);
      await flushPromises();

      expect(store.transactions().length).toBe(2);
      expect(store.totalItems()).toBe(2);
      expect(store.loading()).toBe(false);
    });
  });

  describe('Computed Properties', () => {
    it('deve calcular totalReceivables, totalPayables e totalBalance corretamente', async () => {
      await seedTransactions([
        createMockTx({ type: 'INCOME', amount: 15000, status: 'COMPLETED' }),
        createMockTx({ type: 'INCOME', amount: 5000, status: 'PENDING' }),
        createMockTx({ type: 'EXPENSE', amount: 4000, status: 'COMPLETED' }),
      ]);

      store = TestBed.inject(TreasuryStore);
      await flushPromises();

      expect(store.totalReceivables()).toBe(20000);
      expect(store.totalPayables()).toBe(4000);
      expect(store.totalBalance()).toBe(15000 - 4000);
    });
  });

  describe('Filtros', () => {
    it('deve filtrar transações por tipo', async () => {
      await seedTransactions([
        createMockTx({ type: 'INCOME' }),
        createMockTx({ type: 'EXPENSE' }),
        createMockTx({ type: 'INCOME' }),
      ]);

      store = TestBed.inject(TreasuryStore);
      await flushPromises();

      await store.setFilters({ type: 'EXPENSE' });
      await flushPromises();

      expect(store.transactions().length).toBe(1);
      expect(store.transactions()[0].type).toBe('EXPENSE');
    });
  });
});
