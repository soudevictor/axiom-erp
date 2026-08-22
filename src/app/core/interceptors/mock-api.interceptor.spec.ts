import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { firstValueFrom } from 'rxjs';

import { mockApiInterceptor } from './mock-api.interceptor';
import { db } from '@/core/database/app-database';
import type { InventoryItem } from '@/core/models/inventory.model';
import type { PaginatedResponse } from '@/core/models/pagination.model';

describe('MockApiInterceptor', () => {
  let http: HttpClient;

  beforeEach(async () => {
    await db.inventory.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mockApiInterceptor])),
      ],
    });

    http = TestBed.inject(HttpClient);
  });

  afterEach(async () => {
    await db.inventory.clear();
  });

  it('deve interceptar GET /api/v1/inventory e retornar resposta paginada do Dexie', async () => {
    const item: InventoryItem = {
      id: crypto.randomUUID(),
      sku: 'ELE-0001-9999',
      name: 'Monitor Teste 4K',
      category: 'ELECTRONICS',
      warehouseId: 'WH-SP-001',
      quantity: 50,
      minThreshold: 5,
      unitPrice: 1999.9,
      status: 'IN_STOCK',
      updatedAt: new Date().toISOString(),
    };

    await db.inventory.add(item);

    const res = await firstValueFrom(
      http.get<PaginatedResponse<InventoryItem>>('/api/v1/inventory')
    );

    expect(res.data.length).toBe(1);
    expect(res.totalItems).toBe(1);
    expect(res.data[0].sku).toBe('ELE-0001-9999');
  });

  it('deve simular erro HTTP 500 quando cabeçalho X-Simulate-Error está presente', async () => {
    const headers = new HttpHeaders().set('X-Simulate-Error', 'true');

    try {
      await firstValueFrom(
        http.get('/api/v1/inventory', { headers })
      );
      expect.fail('Deveria ter lançado erro HTTP 500');
    } catch (err: any) {
      expect(err.status).toBe(500);
    }
  });
});
