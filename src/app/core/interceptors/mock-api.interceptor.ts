import {
  HttpErrorResponse,
  HttpParams,
  HttpResponse,
  type HttpInterceptorFn,
} from '@angular/common/http';
import { delay, Observable, of, switchMap, throwError } from 'rxjs';
import { db } from '@/core/database/app-database';
import type { InventoryItem } from '@/core/models/inventory.model';
import type { PaginatedResponse } from '@/core/models/pagination.model';

const API_PREFIX = '/api/v1/inventory';
const SIMULATED_LATENCY_MS = 300;
const SIMULATE_ERROR_HEADER = 'X-Simulate-Error';

function shouldSimulateError(headers: { get(name: string): string | null }): boolean {
  return headers.get(SIMULATE_ERROR_HEADER) === 'true';
}

function createErrorResponse(url: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 500,
    statusText: 'Internal Server Error',
    url,
    error: { message: 'Simulated server error for testing purposes.' },
  });
}

async function handleGetInventory(
  params: HttpParams
): Promise<PaginatedResponse<InventoryItem>> {
  const search = params.get('search') ?? '';
  const category = params.get('category') ?? '';
  const status = params.get('status') ?? '';
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '20', 10)));
  const sortBy = (params.get('sortBy') ?? 'updatedAt') as keyof InventoryItem;
  const sortOrder = (params.get('sortOrder') ?? 'desc') as 'asc' | 'desc';

  let collection = db.inventory.toCollection();

  let allItems = await collection.toArray();

  if (search) {
    const lowerSearch = search.toLowerCase();
    allItems = allItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.sku.toLowerCase().includes(lowerSearch)
    );
  }

  if (category) {
    allItems = allItems.filter((item) => item.category === category);
  }

  if (status) {
    allItems = allItems.filter((item) => item.status === status);
  }

  allItems.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    let comparison = 0;
    if (aVal instanceof Date && bVal instanceof Date) {
      comparison = aVal.getTime() - bVal.getTime();
    } else if (typeof aVal === 'string' && typeof bVal === 'string') {
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

  return {
    data,
    totalItems,
    currentPage: page,
    pageSize: limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
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
      error: { message: `Item with id "${id}" not found.` },
    });
  }
  return updated;
}

async function handleDeleteInventory(id: string): Promise<void> {
  await db.inventory.delete(id);
}

function extractIdFromUrl(url: string): string {
  const segments = url.split('/');
  return segments[segments.length - 1] ?? '';
}

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_PREFIX)) {
    return next(req);
  }

  if (shouldSimulateError(req.headers)) {
    return of(null).pipe(
      delay(SIMULATED_LATENCY_MS),
      switchMap(() => throwError(() => createErrorResponse(req.url)))
    );
  }

  const isCollectionUrl = req.url === API_PREFIX || req.url.startsWith(`${API_PREFIX}?`);
  const itemId = !isCollectionUrl ? extractIdFromUrl(req.url) : '';

  let response$: Observable<HttpResponse<unknown>>;

  switch (req.method) {
    case 'GET': {
      response$ = new Observable<HttpResponse<unknown>>((subscriber) => {
        handleGetInventory(req.params)
          .then((result) => {
            subscriber.next(
              new HttpResponse({ status: 200, body: result })
            );
            subscriber.complete();
          })
          .catch((err: unknown) => subscriber.error(err));
      });
      break;
    }

    case 'POST': {
      response$ = new Observable<HttpResponse<unknown>>((subscriber) => {
        handlePostInventory(req.body as Omit<InventoryItem, 'id'>)
          .then((created) => {
            subscriber.next(
              new HttpResponse({ status: 201, body: created })
            );
            subscriber.complete();
          })
          .catch((err: unknown) => subscriber.error(err));
      });
      break;
    }

    case 'PUT': {
      response$ = new Observable<HttpResponse<unknown>>((subscriber) => {
        handlePutInventory(itemId, req.body as Partial<InventoryItem>)
          .then((updated) => {
            subscriber.next(
              new HttpResponse({ status: 200, body: updated })
            );
            subscriber.complete();
          })
          .catch((err: unknown) => subscriber.error(err));
      });
      break;
    }

    case 'DELETE': {
      response$ = new Observable<HttpResponse<unknown>>((subscriber) => {
        handleDeleteInventory(itemId)
          .then(() => {
            subscriber.next(
              new HttpResponse({ status: 204, body: null })
            );
            subscriber.complete();
          })
          .catch((err: unknown) => subscriber.error(err));
      });
      break;
    }

    default:
      return next(req);
  }

  return response$.pipe(delay(SIMULATED_LATENCY_MS));
};
