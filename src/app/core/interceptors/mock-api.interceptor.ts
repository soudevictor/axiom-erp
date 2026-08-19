import {
  HttpErrorResponse,
  HttpParams,
  HttpResponse,
  type HttpInterceptorFn,
} from '@angular/common/http';
import { delay, Observable, of, switchMap, throwError } from 'rxjs';
import { db } from '@/core/database/app-database';
import type { InventoryItem } from '@/core/models/inventory.model';
import type { TreasuryTransaction } from '@/core/models/treasury.model';
import type { PaginatedResponse } from '@/core/models/pagination.model';

const INVENTORY_PREFIX = '/api/v1/inventory';
const TREASURY_PREFIX = '/api/v1/treasury';
const SIMULATE_ERROR_HEADER = 'X-Simulate-Error';

function getSimulatedLatency(): number {
  return Math.floor(Math.random() * (500 - 200 + 1)) + 200;
}

function shouldSimulateError(headers: { get(name: string): string | null }): boolean {
  return headers.get(SIMULATE_ERROR_HEADER) === 'true';
}

function createErrorResponse(url: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 500,
    statusText: 'Internal Server Error',
    url,
    error: { message: 'Erro simulado no servidor para testes de resiliência de UI.' },
  });
}

// ─────────────────────────────────────────────
// INVENTORY HANDLERS
// ─────────────────────────────────────────────

async function handleGetInventory(
  params: HttpParams
): Promise<PaginatedResponse<InventoryItem>> {
  const search = params.get('search') ?? '';
  const category = params.get('category') ?? '';
  const status = params.get('status') ?? '';
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10));
  const limit = Math.min(500, Math.max(1, parseInt(params.get('limit') ?? '20', 10)));
  const sortBy = (params.get('sortBy') ?? 'updatedAt') as keyof InventoryItem;
  const sortOrder = (params.get('sortOrder') ?? 'desc') as 'asc' | 'desc';

  let allItems = await db.inventory.toArray();

  if (search) {
    const lowerSearch = search.toLowerCase();
    allItems = allItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.sku.toLowerCase().includes(lowerSearch)
    );
  }

  if (category && category !== 'ALL') {
    allItems = allItems.filter((item) => item.category === category);
  }

  if (status && status !== 'ALL') {
    allItems = allItems.filter((item) => item.status === status);
  }

  allItems.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    let comparison = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const totalItems = allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const startIndex = (page - 1) * limit;
  const data = allItems.slice(startIndex, startIndex + limit);

  const meta = {
    totalItems,
    currentPage: page,
    pageSize: limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };

  const totalStockValue = allItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const lowStockCount = allItems.filter(
    (item) => item.status === 'LOW_STOCK' || item.quantity <= item.minThreshold
  ).length;

  const summary = { totalStockValue, lowStockCount };

  return {
    data,
    totalItems,
    currentPage: page,
    pageSize: limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    meta,
    summary,
  };
}

async function handlePostInventory(
  body: Omit<InventoryItem, 'id'>
): Promise<InventoryItem> {
  const newItem: InventoryItem = {
    ...body,
    id: crypto.randomUUID(),
    updatedAt: new Date(),
  };
  await db.inventory.add(newItem);
  return newItem;
}

async function handlePutInventory(
  id: string,
  body: Partial<InventoryItem>
): Promise<InventoryItem> {
  const updates = { ...body, updatedAt: new Date() };
  await db.inventory.update(id, updates);

  const updated = await db.inventory.get(id);
  if (!updated) {
    throw new HttpErrorResponse({
      status: 404,
      statusText: 'Not Found',
      error: { message: `Item com ID "${id}" não encontrado.` },
    });
  }
  return updated;
}

async function handleDeleteInventory(id: string): Promise<void> {
  await db.inventory.delete(id);
}

// ─────────────────────────────────────────────
// TREASURY HANDLERS
// ─────────────────────────────────────────────

async function handleGetTreasury(
  params: HttpParams
): Promise<PaginatedResponse<TreasuryTransaction>> {
  const search = params.get('search') ?? '';
  const type = params.get('type') ?? '';
  const status = params.get('status') ?? '';
  const category = params.get('category') ?? '';
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10));
  const limit = Math.min(500, Math.max(1, parseInt(params.get('limit') ?? '20', 10)));
  const sortBy = (params.get('sortBy') ?? 'dueDate') as keyof TreasuryTransaction;
  const sortOrder = (params.get('sortOrder') ?? 'asc') as 'asc' | 'desc';

  let allTransactions = await db.transactions.toArray();

  if (search) {
    const lower = search.toLowerCase();
    allTransactions = allTransactions.filter(
      (t) =>
        t.description.toLowerCase().includes(lower) ||
        t.partnerName.toLowerCase().includes(lower)
    );
  }

  if (type && type !== 'ALL') {
    allTransactions = allTransactions.filter((t) => t.type === type);
  }

  if (status && status !== 'ALL') {
    allTransactions = allTransactions.filter((t) => t.status === status);
  }

  if (category && category !== 'ALL') {
    allTransactions = allTransactions.filter((t) => t.category === category);
  }

  allTransactions.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    let comparison = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const totalItems = allTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const startIndex = (page - 1) * limit;
  const data = allTransactions.slice(startIndex, startIndex + limit);

  const meta = {
    totalItems,
    currentPage: page,
    pageSize: limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };

  const totalReceivables = allTransactions
    .filter((t) => t.type === 'INCOME' && t.status !== 'CANCELLED')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalPayables = allTransactions
    .filter((t) => t.type === 'EXPENSE' && t.status !== 'CANCELLED')
    .reduce((sum, t) => sum + t.amount, 0);
  const incomeCompleted = allTransactions
    .filter((t) => t.type === 'INCOME' && t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseCompleted = allTransactions
    .filter((t) => t.type === 'EXPENSE' && t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalBalance = incomeCompleted - expenseCompleted;

  const summary = { totalReceivables, totalPayables, totalBalance };

  return {
    data,
    totalItems,
    currentPage: page,
    pageSize: limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    meta,
    summary,
  };
}

async function handlePostTreasury(
  body: Omit<TreasuryTransaction, 'id'>
): Promise<TreasuryTransaction> {
  const newTx: TreasuryTransaction = {
    ...body,
    id: crypto.randomUUID(),
  };
  await db.transactions.add(newTx);
  return newTx;
}

async function handlePutTreasury(
  id: string,
  body: Partial<TreasuryTransaction>
): Promise<TreasuryTransaction> {
  await db.transactions.update(id, body);
  const updated = await db.transactions.get(id);
  if (!updated) {
    throw new HttpErrorResponse({
      status: 404,
      statusText: 'Not Found',
      error: { message: `Transação com ID "${id}" não encontrada.` },
    });
  }
  return updated;
}

async function handleDeleteTreasury(id: string): Promise<void> {
  await db.transactions.delete(id);
}

function extractIdFromUrl(url: string, prefix: string): string {
  const cleanUrl = url.split('?')[0];
  return cleanUrl.replace(`${prefix}/`, '').replace(prefix, '');
}

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  const isInventory = req.url.startsWith(INVENTORY_PREFIX);
  const isTreasury = req.url.startsWith(TREASURY_PREFIX);

  if (!isInventory && !isTreasury) {
    return next(req);
  }

  const simulatedDelay = getSimulatedLatency();

  if (shouldSimulateError(req.headers)) {
    return of(null).pipe(
      delay(simulatedDelay),
      switchMap(() => throwError(() => createErrorResponse(req.url)))
    );
  }

  const prefix = isInventory ? INVENTORY_PREFIX : TREASURY_PREFIX;
  const cleanPath = req.url.split('?')[0];
  const itemId = cleanPath !== prefix ? extractIdFromUrl(req.url, prefix) : '';

  let response$: Observable<HttpResponse<unknown>>;

  if (isInventory) {
    switch (req.method) {
      case 'GET':
        response$ = new Observable((subscriber) => {
          handleGetInventory(req.params)
            .then((res) => {
              subscriber.next(new HttpResponse({ status: 200, body: res }));
              subscriber.complete();
            })
            .catch((err) => subscriber.error(err));
        });
        break;
      case 'POST':
        response$ = new Observable((subscriber) => {
          handlePostInventory(req.body as Omit<InventoryItem, 'id'>)
            .then((created) => {
              subscriber.next(new HttpResponse({ status: 201, body: created }));
              subscriber.complete();
            })
            .catch((err) => subscriber.error(err));
        });
        break;
      case 'PUT':
        response$ = new Observable((subscriber) => {
          handlePutInventory(itemId, req.body as Partial<InventoryItem>)
            .then((updated) => {
              subscriber.next(new HttpResponse({ status: 200, body: updated }));
              subscriber.complete();
            })
            .catch((err) => subscriber.error(err));
        });
        break;
      case 'DELETE':
        response$ = new Observable((subscriber) => {
          handleDeleteInventory(itemId)
            .then(() => {
              subscriber.next(new HttpResponse({ status: 204, body: null }));
              subscriber.complete();
            })
            .catch((err) => subscriber.error(err));
        });
        break;
      default:
        return next(req);
    }
  } else {
    switch (req.method) {
      case 'GET':
        response$ = new Observable((subscriber) => {
          handleGetTreasury(req.params)
            .then((res) => {
              subscriber.next(new HttpResponse({ status: 200, body: res }));
              subscriber.complete();
            })
            .catch((err) => subscriber.error(err));
        });
        break;
      case 'POST':
        response$ = new Observable((subscriber) => {
          handlePostTreasury(req.body as Omit<TreasuryTransaction, 'id'>)
            .then((created) => {
              subscriber.next(new HttpResponse({ status: 201, body: created }));
              subscriber.complete();
            })
            .catch((err) => subscriber.error(err));
        });
        break;
      case 'PUT':
        response$ = new Observable((subscriber) => {
          handlePutTreasury(itemId, req.body as Partial<TreasuryTransaction>)
            .then((updated) => {
              subscriber.next(new HttpResponse({ status: 200, body: updated }));
              subscriber.complete();
            })
            .catch((err) => subscriber.error(err));
        });
        break;
      case 'DELETE':
        response$ = new Observable((subscriber) => {
          handleDeleteTreasury(itemId)
            .then(() => {
              subscriber.next(new HttpResponse({ status: 204, body: null }));
              subscriber.complete();
            })
            .catch((err) => subscriber.error(err));
        });
        break;
      default:
        return next(req);
    }
  }

  return response$.pipe(delay(simulatedDelay));
};
