import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PARTNERS_PAGE_SIZE, PartnersStore } from './partners.store';
import { mockApiInterceptor } from '@/core/interceptors/mock-api.interceptor';
import { db } from '@/core/database/app-database';
import type { B2BPartner } from '@/core/models/partner.model';

function createPartner(overrides: Partial<B2BPartner> = {}): B2BPartner {
  return {
    id: crypto.randomUUID(),
    cnpj: '11.222.333/0001-81',
    companyName: 'TechSupply Brasil Distribuidora Ltda',
    category: 'FORNECEDOR',
    status: 'HOMOLOGADO',
    creditLimit: 500000,
    creditUsed: 250000,
    state: 'SP',
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    ...overrides,
  };
}

function flush(ms = 650): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('PartnersStore', () => {
  let store: InstanceType<typeof PartnersStore>;

  beforeEach(async () => {
    await db.partners.clear();
    await db.transactions.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([mockApiInterceptor])), PartnersStore],
    });
  });

  afterEach(async () => {
    await db.partners.clear();
    await db.transactions.clear();
  });

  it('deve carregar uma única vez e permitir refresh forçado', async () => {
    await db.partners.bulkAdd([
      createPartner(),
      createPartner({
        id: 'PART-002',
        cnpj: '22.333.444/0001-81',
        companyName: 'MegaLogística S.A.',
        status: 'BLOQUEADO',
      }),
    ]);

    store = TestBed.inject(PartnersStore);
    await flush();

    expect(store.total()).toBe(2);
    await store.load();
    expect(store.total()).toBe(2);

    await db.partners.add(createPartner({ id: 'PART-003', companyName: 'Novo Parceiro' }));
    await store.refresh();
    expect(store.total()).toBe(3);
  });

  it('deve paginar a exibição em blocos de 20 com scroll infinito', async () => {
    await db.partners.bulkAdd(
      Array.from({ length: 45 }, (_, index) =>
        createPartner({
          id: `PART-${String(index + 1).padStart(3, '0')}`,
          companyName: `Parceiro ${String(index + 1).padStart(2, '0')} Ltda`,
        })
      )
    );

    store = TestBed.inject(PartnersStore);
    await flush();

    expect(store.filteredTotal()).toBe(45);
    expect(store.visibleItems()).toHaveLength(PARTNERS_PAGE_SIZE);
    expect(store.hasMoreItems()).toBe(true);

    store.loadMoreItems();
    expect(store.visibleItems()).toHaveLength(PARTNERS_PAGE_SIZE * 2);

    store.loadMoreItems();
    expect(store.visibleItems()).toHaveLength(45);
    expect(store.hasMoreItems()).toBe(false);

    store.setFilters({ status: 'BLOQUEADO' });
    expect(store.filteredTotal()).toBe(0);
    expect(store.visibleItems()).toHaveLength(0);
  });

  it('deve combinar busca por CNPJ, categoria, status e UF', async () => {
    await db.partners.bulkAdd([
      createPartner(),
      createPartner({
        id: 'PART-002',
        cnpj: '22.333.444/0001-81',
        companyName: 'MegaLogística S.A.',
        category: 'DISTRIBUIDOR',
        status: 'BLOQUEADO',
        state: 'RJ',
      }),
      createPartner({
        id: 'PART-003',
        cnpj: '33.444.555/0001-81',
        companyName: 'Atlas Office',
        category: 'CLIENTE_DIRETO',
        status: 'EM_ANALISE',
        state: 'MG',
      }),
    ]);

    store = TestBed.inject(PartnersStore);
    await flush();

    store.setFilters({ search: '11222333000181' });
    expect(store.filteredItems()).toHaveLength(1);
    expect(store.filteredItems()[0].companyName).toBe('TechSupply Brasil Distribuidora Ltda');

    store.setFilters({ search: '11.222.333/0001-81' });
    expect(store.filteredItems()).toHaveLength(1);

    store.setFilters({ search: '', category: 'DISTRIBUIDOR', status: 'BLOQUEADO', state: 'RJ' });
    expect(store.filteredItems()).toHaveLength(1);
    expect(store.filteredItems()[0].companyName).toBe('MegaLogística S.A.');

    store.setFilters({ state: 'MG' });
    expect(store.filteredItems()).toHaveLength(0);
  });

  it('deve calcular KPIs sobre todos os parceiros mesmo com filtro ativo', async () => {
    await db.partners.bulkAdd([
      createPartner({ creditLimit: 1000, creditUsed: 500 }),
      createPartner({
        id: 'PART-002',
        companyName: 'Bloqueado Ltda',
        status: 'BLOQUEADO',
        creditLimit: 500,
        creditUsed: 300,
      }),
      createPartner({
        id: 'PART-003',
        companyName: 'Em análise Ltda',
        status: 'EM_ANALISE',
        creditLimit: 500,
        creditUsed: 0,
      }),
    ]);

    store = TestBed.inject(PartnersStore);
    await flush();
    store.setFilters({ status: 'BLOQUEADO' });

    expect(store.filteredItems()).toHaveLength(1);
    expect(store.total()).toBe(3);
    expect(store.homologated()).toBe(1);
    expect(store.blocked()).toBe(1);
    expect(store.inAnalysis()).toBe(1);
    expect(store.creditLimitTotal()).toBe(2000);
    expect(store.creditUsedTotal()).toBe(800);
    expect(store.creditUsagePct()).toBe(40);
  });

  it('deve criar, editar, homologar e excluir mantendo os KPIs coerentes', async () => {
    store = TestBed.inject(PartnersStore);
    await flush();
    expect(store.total()).toBe(0);

    const created = await store.create({
      cnpj: '12.345.678/0001-95',
      companyName: 'Parceiro de Teste Ltda',
      category: 'FORNECEDOR',
      creditLimit: 200000,
      state: 'SP',
    });

    expect(created.status).toBe('EM_ANALISE');
    expect(store.total()).toBe(1);
    expect(store.inAnalysis()).toBe(1);

    const updated = await store.update(created.id, {
      cnpj: created.cnpj,
      companyName: 'Parceiro Editado Ltda',
      category: 'DISTRIBUIDOR',
      creditLimit: 300000,
      state: 'PR',
    });

    expect(updated.id).toBe(created.id);
    expect(store.items()[0].companyName).toBe('Parceiro Editado Ltda');
    expect(store.creditLimitTotal()).toBe(300000);

    const homologated = await store.changeStatus(created.id, 'HOMOLOGADO');
    expect(homologated.status).toBe('HOMOLOGADO');
    expect(store.inAnalysis()).toBe(0);
    expect(store.homologated()).toBe(1);

    await store.remove(created.id);
    expect(store.total()).toBe(0);
  });

  it('deve relançar erro de validação sem alterar a lista', async () => {
    await db.partners.add(createPartner());
    store = TestBed.inject(PartnersStore);
    await flush();

    await expect(
      store.create({
        cnpj: '11.111.111/1111-11',
        companyName: 'Inválido Ltda',
        category: 'FORNECEDOR',
        creditLimit: 1000,
        state: 'SP',
      })
    ).rejects.toMatchObject({ status: 422 });

    expect(store.total()).toBe(1);
    expect(store.error()).toContain('CNPJ');
  });
});
