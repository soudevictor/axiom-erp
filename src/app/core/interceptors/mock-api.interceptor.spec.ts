import { HttpClient, HttpHeaders, HttpParams, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';

import { mockApiInterceptor } from './mock-api.interceptor';
import { db } from '@/core/database/app-database';
import { deriveInventoryStatus } from '@/core/models/inventory.model';
import type { InventoryItem, InventorySummary } from '@/core/models/inventory.model';
import type { B2BPartner, PartnerInput } from '@/core/models/partner.model';
import type { PaginatedResponse } from '@/core/models/pagination.model';
import type { StockMovementResult } from '@/core/models/stock-movement.model';
import type { TreasuryTransaction } from '@/core/models/treasury.model';

interface InventoryListResponse extends PaginatedResponse<InventoryItem> {
  readonly summary: InventorySummary | null;
}

function createItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  const quantity = overrides.quantity ?? 50;
  const minThreshold = overrides.minThreshold ?? 5;
  return {
    id: crypto.randomUUID(),
    sku: 'ELE-TEST-0001',
    name: 'Monitor Teste 4K',
    category: 'ELECTRONICS',
    warehouseId: 'WH-SP-001',
    quantity,
    minThreshold,
    unitPrice: 1999.9,
    status: deriveInventoryStatus(quantity, minThreshold),
    updatedAt: new Date('2026-10-20T12:00:00.000Z'),
    ...overrides,
  };
}

function createPartner(overrides: Partial<B2BPartner> = {}): B2BPartner {
  return {
    id: 'PART-001',
    cnpj: '11.222.333/0001-81',
    companyName: 'TechSupply Brasil Distribuidora Ltda',
    tradeName: 'TechSupply Brasil',
    category: 'FORNECEDOR',
    status: 'HOMOLOGADO',
    creditLimit: 550000,
    creditUsed: 385000,
    state: 'SP',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-10-17T12:00:00.000Z',
    ...overrides,
  };
}

async function expectHttpError(promise: Promise<unknown>, status: number): Promise<void> {
  try {
    await promise;
    expect.fail(`Deveria ter lançado erro HTTP ${status}`);
  } catch (error) {
    expect((error as { status: number }).status).toBe(status);
  }
}

async function clearDatabase(): Promise<void> {
  await Promise.all([
    db.inventory.clear(),
    db.stockMovements.clear(),
    db.transactions.clear(),
    db.partners.clear(),
  ]);
}

// Mock Dexie transaction to avoid fake-indexeddb PrematureCommitError
function mockDbTransaction() {
  return vi.spyOn(db, 'transaction').mockImplementation(
    async (...args: unknown[]) => {
      // Dexie transaction can be called as (mode, table1, table2, ..., callback)
      // or (mode, tables[], callback). Find the last argument which is the callback.
      const callback = args[args.length - 1];
      if (typeof callback !== 'function') {
        throw new Error('Transaction callback not found');
      }
      // Provide a minimal transaction object
      const mockTrans = {
        table: vi.fn().mockReturnValue(db),
      };
      return callback(mockTrans);
    }
  );
}

describe('MockApiInterceptor', () => {
  let http: HttpClient;
  let transactionMock: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await clearDatabase();
    transactionMock = mockDbTransaction();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([mockApiInterceptor]))],
    });

    http = TestBed.inject(HttpClient);
  });

  afterEach(async () => {
    await clearDatabase();
    transactionMock?.mockRestore();
  });

  describe('estoque', () => {
    it('deve retornar a lista paginada do Dexie', async () => {
      const item = createItem({ sku: 'ELE-0001-9999' });
      await db.inventory.add(item);

      const res = await firstValueFrom(
        http.get<PaginatedResponse<InventoryItem>>('/api/v1/inventory')
      );

      expect(res.data).toHaveLength(1);
      expect(res.totalItems).toBe(1);
      expect(res.data[0].sku).toBe('ELE-0001-9999');
    });

    it('deve calcular summary global mesmo com filtros na lista', async () => {
      await db.inventory.bulkAdd([
        createItem({ quantity: 100, unitPrice: 10, minThreshold: 5 }),
        createItem({
          sku: 'HAR-TEST-0002',
          quantity: 2,
          minThreshold: 10,
          unitPrice: 10,
        }),
      ]);

      const res = await firstValueFrom(
        http.get<InventoryListResponse>('/api/v1/inventory', {
          params: new HttpParams().set('status', 'LOW_STOCK'),
        })
      );

      expect(res.data).toHaveLength(1);
      expect(res.summary?.totalStockValue).toBe(1020);
      expect(res.summary?.lowStockCount).toBe(1);
    });

    it('deve somar entrada, subtrair saída e recalcular o status', async () => {
      const item = createItem({ quantity: 10, minThreshold: 5 });
      await db.inventory.add(item);

      const inbound = await firstValueFrom(
        http.post<StockMovementResult>(`/api/v1/inventory/${item.id}/movements`, {
          type: 'IN',
          quantity: 5,
          reason: 'COMPRA',
        })
      );

      expect(inbound.item.quantity).toBe(15);
      expect(inbound.movement.previousQuantity).toBe(10);
      expect(inbound.movement.newQuantity).toBe(15);

      const outbound = await firstValueFrom(
        http.post<StockMovementResult>(`/api/v1/inventory/${item.id}/movements`, {
          type: 'OUT',
          quantity: 12,
          reason: 'VENDA',
        })
      );

      expect(outbound.item.quantity).toBe(3);
      expect(outbound.item.status).toBe('LOW_STOCK');
      expect((await db.inventory.get(item.id))?.quantity).toBe(3);
      expect(await db.stockMovements.count()).toBe(2);
    });

    it('deve recusar saída acima do saldo sem alterar item nem ledger', async () => {
      const item = createItem({ quantity: 3 });
      await db.inventory.add(item);

      await expectHttpError(
        firstValueFrom(
          http.post(`/api/v1/inventory/${item.id}/movements`, {
            type: 'OUT',
            quantity: 4,
            reason: 'VENDA',
          })
        ),
        422
      );

      expect((await db.inventory.get(item.id))?.quantity).toBe(3);
      expect(await db.stockMovements.count()).toBe(0);
    });

    it('deve tratar ajuste como saldo final e rejeitar ajuste sem alteração', async () => {
      const item = createItem({ quantity: 10 });
      await db.inventory.add(item);

      const adjusted = await firstValueFrom(
        http.post<StockMovementResult>(`/api/v1/inventory/${item.id}/movements`, {
          type: 'ADJUSTMENT',
          quantity: 7,
          reason: 'INVENTARIO',
        })
      );

      expect(adjusted.item.quantity).toBe(7);
      expect(adjusted.movement.newQuantity).toBe(7);

      await expectHttpError(
        firstValueFrom(
          http.post(`/api/v1/inventory/${item.id}/movements`, {
            type: 'ADJUSTMENT',
            quantity: 7,
            reason: 'INVENTARIO',
          })
        ),
        422
      );
    });

    it('deve ignorar quantity no PUT e manter o ledger intacto', async () => {
      const item = createItem({ quantity: 18 });
      await db.inventory.add(item);

      const updated = await firstValueFrom(
        http.put<InventoryItem>(`/api/v1/inventory/${item.id}`, {
          sku: item.sku,
          name: 'Monitor Atualizado',
          category: item.category,
          warehouseId: item.warehouseId,
          minThreshold: 4,
          unitPrice: 1500,
          quantity: 999,
        })
      );

      expect(updated.name).toBe('Monitor Atualizado');
      expect(updated.quantity).toBe(18);
      expect(await db.stockMovements.count()).toBe(0);
    });

    it('deve criar saldo inicial como movimento e restaurar o mesmo id', async () => {
      const created = await firstValueFrom(
        http.post<InventoryItem>('/api/v1/inventory', {
          sku: 'ELE-ABCD-9001',
          name: 'Produto de Teste',
          category: 'ELECTRONICS',
          warehouseId: 'WH-SP-001',
          quantity: 12,
          minThreshold: 2,
          unitPrice: 50,
        })
      );

      const movements = await db.stockMovements.where('itemId').equals(created.id).toArray();
      expect(movements).toHaveLength(1);
      expect(movements[0].previousQuantity).toBe(0);
      expect(movements[0].newQuantity).toBe(12);
      expect(movements[0].reason).toBe('AJUSTE');

      await firstValueFrom(http.delete<void>(`/api/v1/inventory/${created.id}`));
      expect(await db.inventory.get(created.id)).toBeUndefined();
      expect(movements).toHaveLength(1);

      const restored = await firstValueFrom(
        http.post<InventoryItem>('/api/v1/inventory/restore', created)
      );
      expect(restored.id).toBe(created.id);
      expect(await db.inventory.count()).toBe(1);
    });

    it('deve simular erro HTTP 500 quando o cabeçalho estiver presente', async () => {
      const headers = new HttpHeaders().set('X-Simulate-Error', 'true');

      await expectHttpError(firstValueFrom(http.get('/api/v1/inventory', { headers })), 500);
    });
  });

  describe('parceiros', () => {
    it('deve filtrar por nome e CNPJ com ou sem máscara', async () => {
      await db.partners.bulkAdd([
        createPartner(),
        createPartner({
          id: 'PART-002',
          cnpj: '22.333.444/0001-81',
          companyName: 'MegaLogística Soluções de Transporte S.A.',
        }),
      ]);

      const byName = await firstValueFrom(
        http.get<B2BPartner[]>('/api/v1/partners', {
          params: new HttpParams().set('search', 'Mega'),
        })
      );
      const byCnpj = await firstValueFrom(
        http.get<B2BPartner[]>('/api/v1/partners', {
          params: new HttpParams().set('search', '11222333000181'),
        })
      );

      expect(byName).toHaveLength(1);
      expect(byName[0].id).toBe('PART-002');
      expect(byCnpj).toHaveLength(1);
      expect(byCnpj[0].id).toBe('PART-001');
    });

    it('deve criar parceiro em análise com crédito zerado e id sequencial', async () => {
      await db.partners.add(createPartner());

      const input: PartnerInput = {
        cnpj: '12.345.678/0001-95',
        companyName: 'Parceiro Novo Ltda',
        category: 'FORNECEDOR',
        creditLimit: 250000,
        state: 'SP',
      };

      const created = await firstValueFrom(
        http.post<B2BPartner>('/api/v1/partners', input)
      );

      expect(created.id).toBe('PART-002');
      expect(created.status).toBe('EM_ANALISE');
      expect(created.creditUsed).toBe(0);
      expect(created.createdAt).toBeTruthy();
    });

    it('deve recusar CNPJ duplicado e inválido', async () => {
      await db.partners.add(createPartner());

      await expectHttpError(
        firstValueFrom(
          http.post('/api/v1/partners', {
            cnpj: '11222333000181',
            companyName: 'Duplicado Ltda',
            category: 'FORNECEDOR',
            creditLimit: 1000,
            state: 'SP',
          })
        ),
        409
      );

      await expectHttpError(
        firstValueFrom(
          http.post('/api/v1/partners', {
            cnpj: '11.111.111/1111-11',
            companyName: 'Inválido Ltda',
            category: 'FORNECEDOR',
            creditLimit: 1000,
            state: 'SP',
          })
        ),
        422
      );
    });

    it('deve validar transições e exigir motivo para bloqueio', async () => {
      await db.partners.add(createPartner());

      await expectHttpError(
        firstValueFrom(
          http.patch('/api/v1/partners/PART-001/status', { status: 'EM_ANALISE' })
        ),
        422
      );

      await expectHttpError(
        firstValueFrom(
          http.patch('/api/v1/partners/PART-001/status', { status: 'BLOQUEADO' })
        ),
        422
      );

      const blocked = await firstValueFrom(
        http.patch<B2BPartner>('/api/v1/partners/PART-001/status', {
          status: 'BLOQUEADO',
          reason: 'Limite excedido',
        })
      );

      expect(blocked.status).toBe('BLOQUEADO');
      expect(blocked.statusReason).toBe('Limite excedido');
    });

    it('deve impedir exclusão com crédito ou transação e permitir sem vínculo', async () => {
      await db.partners.add(createPartner());

      await expectHttpError(
        firstValueFrom(http.delete('/api/v1/partners/PART-001')),
        409
      );

      await db.partners.put(createPartner({ creditUsed: 0 }));
      const transaction: TreasuryTransaction = {
        id: 'TX-001',
        description: 'Recebimento vinculado',
        type: 'INCOME',
        amount: 100,
        category: 'CLIENT_RECEIPT',
        partnerId: 'PART-001',
        partnerName: 'TechSupply Brasil Distribuidora Ltda',
        status: 'PENDING',
        dueDate: '2026-10-30',
      };
      await db.transactions.add(transaction);

      await expectHttpError(
        firstValueFrom(http.delete('/api/v1/partners/PART-001')),
        409
      );

      await db.transactions.clear();
      await firstValueFrom(http.delete<void>('/api/v1/partners/PART-001'));
      expect(await db.partners.get('PART-001')).toBeUndefined();
    });
  });
});