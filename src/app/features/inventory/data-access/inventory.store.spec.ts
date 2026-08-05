import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { InventoryStore } from './inventory.store';
import { mockApiInterceptor } from '@/core/interceptors/mock-api.interceptor';
import { db } from '@/core/database/app-database';
import type { InventoryItem } from '@/core/models/inventory.model';

function createMockItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: crypto.randomUUID(),
    sku: 'ELE-TEST-0001',
    name: 'Test Product',
    category: 'ELECTRONICS',
    warehouseId: 'WH-SP-001',
    quantity: 100,
    minThreshold: 10,
    unitPrice: 49.99,
    status: 'IN_STOCK',
    updatedAt: new Date(),
    ...overrides,
  };
}

async function seedTestData(items: InventoryItem[]): Promise<void> {
  await db.inventory.bulkAdd(items);
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 500));
}

describe('InventoryStore', () => {
  let store: InstanceType<typeof InventoryStore>;

  beforeEach(async () => {
    await db.inventory.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mockApiInterceptor])),
        InventoryStore,
      ],
    });
  });

  afterEach(async () => {
    await db.inventory.clear();
  });

  describe('Estado Inicial', () => {
    it('deve iniciar com estado padrão antes do carregamento', () => {
      store = TestBed.inject(InventoryStore);

      expect(store.filters().search).toBe('');
      expect(store.filters().category).toBeNull();
      expect(store.filters().status).toBeNull();
      expect(store.filters().page).toBe(1);
      expect(store.filters().limit).toBe(20);
      expect(store.filters().sortBy).toBe('updatedAt');
      expect(store.filters().sortOrder).toBe('desc');
      expect(store.error()).toBeNull();
    });

    it('deve carregar itens automaticamente via onInit', async () => {
      const items = [createMockItem(), createMockItem({ sku: 'HW-TEST-0002' })];
      await seedTestData(items);

      store = TestBed.inject(InventoryStore);
      await flushPromises();

      expect(store.items().length).toBe(2);
      expect(store.totalItems()).toBe(2);
      expect(store.loading()).toBe(false);
    });
  });

  describe('Filtros e Recarregamento', () => {
    it('deve aplicar filtro de categoria e recarregar itens', async () => {
      await seedTestData([
        createMockItem({ category: 'ELECTRONICS' }),
        createMockItem({ category: 'OFFICE' }),
        createMockItem({ category: 'ELECTRONICS' }),
      ]);

      store = TestBed.inject(InventoryStore);
      await flushPromises();

      await store.setFilters({ category: 'ELECTRONICS' });
      await flushPromises();

      expect(store.items().length).toBe(2);
      expect(store.totalItems()).toBe(2);
      store.items().forEach((item) => {
        expect(item.category).toBe('ELECTRONICS');
      });
    });

    it('deve aplicar filtro de busca textual por nome', async () => {
      await seedTestData([
        createMockItem({ name: 'Monitor Ultra Wide' }),
        createMockItem({ name: 'Teclado Mecânico RGB' }),
        createMockItem({ name: 'Monitor Gamer 144Hz' }),
      ]);

      store = TestBed.inject(InventoryStore);
      await flushPromises();

      await store.setFilters({ search: 'Monitor' });
      await flushPromises();

      expect(store.items().length).toBe(2);
    });

    it('deve resetar filtros ao chamar resetFilters', async () => {
      store = TestBed.inject(InventoryStore);
      await flushPromises();

      await store.setFilters({ category: 'OFFICE', search: 'Caneta' });
      await flushPromises();

      store.resetFilters();

      expect(store.filters().search).toBe('');
      expect(store.filters().category).toBeNull();
      expect(store.filters().status).toBeNull();
    });

    it('deve retornar hasActiveFilters como true quando há filtros aplicados', async () => {
      store = TestBed.inject(InventoryStore);
      await flushPromises();

      expect(store.hasActiveFilters()).toBe(false);

      await store.setFilters({ category: 'HARDWARE' });
      await flushPromises();

      expect(store.hasActiveFilters()).toBe(true);
    });
  });

  describe('Computed Properties', () => {
    it('deve calcular lowStockCount corretamente', async () => {
      await seedTestData([
        createMockItem({ quantity: 100, minThreshold: 10, status: 'IN_STOCK' }),
        createMockItem({ quantity: 5, minThreshold: 10, status: 'LOW_STOCK' }),
        createMockItem({ quantity: 0, minThreshold: 10, status: 'OUT_OF_STOCK' }),
        createMockItem({ quantity: 8, minThreshold: 10, status: 'LOW_STOCK' }),
      ]);

      store = TestBed.inject(InventoryStore);
      await flushPromises();

      expect(store.lowStockCount()).toBe(3);
    });

    it('deve calcular totalStockValue como soma de quantity * unitPrice', async () => {
      await seedTestData([
        createMockItem({ quantity: 10, unitPrice: 100 }),
        createMockItem({ quantity: 5, unitPrice: 200 }),
        createMockItem({ quantity: 3, unitPrice: 50 }),
      ]);

      store = TestBed.inject(InventoryStore);
      await flushPromises();

      expect(store.totalStockValue()).toBe(10 * 100 + 5 * 200 + 3 * 50);
    });

    it('deve retornar totalStockValue zero quando não há itens', async () => {
      store = TestBed.inject(InventoryStore);
      await flushPromises();

      expect(store.totalStockValue()).toBe(0);
    });

    it('deve retornar lowStockCount zero quando todos os itens estão em estoque', async () => {
      await seedTestData([
        createMockItem({ quantity: 100, minThreshold: 10, status: 'IN_STOCK' }),
        createMockItem({ quantity: 200, minThreshold: 20, status: 'IN_STOCK' }),
      ]);

      store = TestBed.inject(InventoryStore);
      await flushPromises();

      expect(store.lowStockCount()).toBe(0);
    });
  });
});
