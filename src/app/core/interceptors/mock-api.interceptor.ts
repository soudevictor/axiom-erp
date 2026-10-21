import {
  HttpErrorResponse,
  HttpResponse,
  type HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { delay, Observable, of, switchMap, throwError } from 'rxjs';
import { db } from '@/core/database/app-database';
import type {
  CreateInventoryItem,
  InventoryCategory,
  InventoryItem,
  InventorySummary,
  UpdateInventoryItem,
} from '@/core/models/inventory.model';
import {
  deriveInventoryStatus,
  INVENTORY_CATEGORIES,
  inventoryItemValue,
} from '@/core/models/inventory.model';
import type {
  B2BPartner,
  PartnerInput,
  PartnerStatus,
} from '@/core/models/partner.model';
import {
  BRAZILIAN_STATES,
  PARTNER_CATEGORIES,
  PARTNER_STATUS_TRANSITIONS,
} from '@/core/models/partner.model';
import type { PaginatedResponse } from '@/core/models/pagination.model';
import type {
  StockMovement,
  StockMovementInput,
  StockMovementResult,
} from '@/core/models/stock-movement.model';
import { STOCK_MOVEMENT_REASONS } from '@/core/models/stock-movement.model';
import type {
  TransactionInput,
  TransactionStatus,
  TreasurySummary,
  TreasuryTransaction,
} from '@/core/models/treasury.model';
import { WAREHOUSES } from '@/core/models/warehouse.model';
import { formatCnpj, isValidCnpj, normalizeCnpj } from '@/shared/utils/cnpj-validator';
import { DevResilienceService } from './dev-resilience.service';

const INVENTORY_PREFIX = '/api/v1/inventory';
const TREASURY_PREFIX = '/api/v1/treasury';
const PARTNERS_PREFIX = '/api/v1/partners';
const SIMULATE_ERROR_HEADER = 'X-Simulate-Error';
const DAY = 86_400_000;

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
};

function apiError(status: number, url: string, code: string, message: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    statusText: STATUS_TEXT[status] ?? 'Error',
    url,
    error: { code, message },
  });
}

function getSimulatedLatency(slowLatency: boolean): number {
  const base = Math.floor(Math.random() * (500 - 200 + 1)) + 200;
  return slowLatency ? base + 2000 : base;
}

function shouldSimulateError(
  headers: { get(name: string): string | null },
  serviceFlag: boolean
): boolean {
  return serviceFlag || headers.get(SIMULATE_ERROR_HEADER) === 'true';
}

function createErrorResponse(url: string): HttpErrorResponse {
  return apiError(
    500,
    url,
    'ERRO_SIMULADO',
    'Erro simulado no servidor para testes de resiliência de UI.'
  );
}

function handle<T>(
  operation: () => Promise<T>,
  status = 200
): Observable<HttpResponse<T>> {
  return new Observable<HttpResponse<T>>((subscriber) => {
    operation()
      .then((body) => {
        subscriber.next(new HttpResponse({ status, body }));
        subscriber.complete();
      })
      .catch((error: unknown) => subscriber.error(error));
  });
}

function intParam(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  const safe = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(max, Math.max(min, safe));
}

function compareValues(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''), 'pt-BR');
}

function paginate<T>(
  items: readonly T[],
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    totalItems,
    currentPage,
    pageSize: limit,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    meta: {
      totalItems,
      currentPage,
      pageSize: limit,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  };
}

function sortByKey<T>(items: T[], key: keyof T, direction: 'asc' | 'desc'): T[] {
  return [...items].sort((a, b) => {
    const comparison = compareValues(a[key], b[key]);
    return direction === 'desc' ? -comparison : comparison;
  });
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthDate(now: Date, offset: number): Date {
  return new Date(now.getFullYear(), now.getMonth() + offset, 1, 12, 0, 0, 0);
}

// ─────────────────────────────────────────────
// INVENTORY
// ─────────────────────────────────────────────

const INVENTORY_SORT_KEYS = new Set<keyof InventoryItem>([
  'sku',
  'name',
  'category',
  'warehouseId',
  'quantity',
  'minThreshold',
  'unitPrice',
  'status',
  'updatedAt',
]);

function normalizeSku(value: string): string {
  return value.trim().toUpperCase();
}

const SKU_PATTERN = /^[A-Z]{3}-[A-Z0-9]{4}-\d{4}$/;

async function ensureUniqueSku(sku: string, exceptId?: string): Promise<void> {
  const existing = await db.inventory
    .filter((item) => item.sku.toUpperCase() === sku.toUpperCase() && item.id !== exceptId)
    .first();
  if (existing) {
    throw apiError(409, '/api/v1/inventory', 'SKU_DUPLICADO', 'Já existe um produto com este SKU.');
  }
}

async function validateSku(sku: string, exceptId?: string): Promise<void> {
  if (!SKU_PATTERN.test(sku)) {
    throw apiError(
      422,
      '/api/v1/inventory',
      'SKU_FORMATO',
      'Use o formato ABC-1234-0000 para o SKU.'
    );
  }
  await ensureUniqueSku(sku, exceptId);
}

function validateInventoryFields(input: {
  name: string;
  category: InventoryCategory;
  warehouseId: string;
  minThreshold: number;
  unitPrice: number;
}): void {
  if (input.name.trim().length < 3 || input.name.trim().length > 120) {
    throw apiError(422, '/api/v1/inventory', 'VALIDACAO', 'O nome deve ter entre 3 e 120 caracteres.');
  }
  if (!INVENTORY_CATEGORIES.includes(input.category)) {
    throw apiError(422, '/api/v1/inventory', 'VALIDACAO', 'Categoria inválida.');
  }
  if (!WAREHOUSES.some((warehouse) => warehouse.id === input.warehouseId)) {
    throw apiError(422, '/api/v1/inventory', 'VALIDACAO', 'Armazém inválido.');
  }
  if (!Number.isInteger(input.minThreshold) || input.minThreshold < 0) {
    throw apiError(422, '/api/v1/inventory', 'VALIDACAO', 'O mínimo deve ser um inteiro não negativo.');
  }
  if (!Number.isFinite(input.unitPrice) || input.unitPrice <= 0) {
    throw apiError(422, '/api/v1/inventory', 'VALIDACAO', 'O preço unitário deve ser maior que zero.');
  }
}

async function buildInventorySummary(): Promise<InventorySummary> {
  const [items, movements] = await Promise.all([
    db.inventory.toArray(),
    db.stockMovements.toArray(),
  ]);

  const byWarehouse = WAREHOUSES.map((warehouse) => {
    const rows = items.filter((item) => item.warehouseId === warehouse.id);
    return {
      warehouseId: warehouse.id,
      skus: rows.length,
      units: rows.reduce((sum, item) => sum + item.quantity, 0),
      value: roundMoney(rows.reduce((sum, item) => sum + inventoryItemValue(item), 0)),
    };
  });

  const byCategory = INVENTORY_CATEGORIES.map((category) => {
    const rows = items.filter((item) => item.category === category);
    return {
      category,
      skus: rows.length,
      units: rows.reduce((sum, item) => sum + item.quantity, 0),
      value: roundMoney(rows.reduce((sum, item) => sum + inventoryItemValue(item), 0)),
    };
  });

  const cutoff = Date.now() - 30 * DAY;
  const lastMovement = movements.reduce<string | null>(
    (latest, movement) => (!latest || movement.createdAt > latest ? movement.createdAt : latest),
    null
  );

  return {
    totalSkus: items.length,
    totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
    totalStockValue: roundMoney(items.reduce((sum, item) => sum + inventoryItemValue(item), 0)),
    inStockCount: items.filter((item) => item.status === 'IN_STOCK').length,
    lowStockCount: items.filter((item) => item.quantity <= item.minThreshold).length,
    outOfStockCount: items.filter((item) => item.status === 'OUT_OF_STOCK').length,
    movementsLast30Days: movements.filter(
      (movement) => new Date(movement.createdAt).getTime() >= cutoff
    ).length,
    lastMovementAt: lastMovement,
    byWarehouse,
    byCategory,
    criticalItems: items
      .filter((item) => item.quantity <= item.minThreshold)
      .sort((a, b) => {
        if (a.quantity === 0 && b.quantity !== 0) return -1;
        if (b.quantity === 0 && a.quantity !== 0) return 1;
        return a.quantity - a.minThreshold - (b.quantity - b.minThreshold);
      })
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        minThreshold: item.minThreshold,
        warehouseId: item.warehouseId,
      })),
  };
}

async function handleGetInventory(params: {
  get(name: string): string | null;
}): Promise<PaginatedResponse<InventoryItem>> {
  const search = (params.get('search') ?? '').trim().toLowerCase();
  const category = params.get('category');
  const status = params.get('status');
  const warehouseId = params.get('warehouseId');
  const page = intParam(params.get('page'), 1, 1, 100_000);
  const limit = intParam(params.get('limit'), 20, 1, 1000);
  const sortCandidate = (params.get('sortBy') ?? 'updatedAt') as keyof InventoryItem;
  const sortBy = INVENTORY_SORT_KEYS.has(sortCandidate) ? sortCandidate : 'updatedAt';
  const sortOrder = params.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  let items = await db.inventory.toArray();
  if (search) {
    const digits = normalizeCnpj(search);
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.sku.toLowerCase().includes(search) ||
        (digits.length > 0 && normalizeCnpj(item.sku).includes(digits))
    );
  }
  if (category && category !== 'ALL') {
    items = items.filter((item) => item.category === category);
  }
  if (status && status !== 'ALL') {
    items = items.filter((item) => item.status === status);
  }
  if (warehouseId && warehouseId !== 'ALL') {
    items = items.filter((item) => item.warehouseId === warehouseId);
  }

  const sorted = sortByKey(items, sortBy, sortOrder);
  const response = paginate(sorted, page, limit);
  const summary = await buildInventorySummary();
  return {
    ...response,
    summary: {
      totalStockValue: summary.totalStockValue,
      lowStockCount: summary.lowStockCount,
    },
  };
}

async function handlePostInventory(body: CreateInventoryItem): Promise<InventoryItem> {
  const sku = normalizeSku(body.sku ?? '');
  await validateSku(sku);
  validateInventoryFields(body);

  if (!Number.isInteger(body.quantity) || body.quantity < 0) {
    throw apiError(422, '/api/v1/inventory', 'VALIDACAO', 'A quantidade deve ser um inteiro não negativo.');
  }

  const item: InventoryItem = {
    id: crypto.randomUUID(),
    sku,
    name: body.name.trim(),
    category: body.category,
    warehouseId: body.warehouseId,
    quantity: body.quantity,
    minThreshold: body.minThreshold,
    unitPrice: roundMoney(body.unitPrice),
    status: deriveInventoryStatus(body.quantity, body.minThreshold),
    updatedAt: new Date(),
  };

  await db.transaction('rw', db.inventory, db.stockMovements, async () => {
    await db.inventory.add(item);
    if (item.quantity > 0) {
      const movement: StockMovement = {
        id: crypto.randomUUID(),
        itemId: item.id,
        sku: item.sku,
        itemName: item.name,
        warehouseId: item.warehouseId,
        type: 'IN',
        quantity: item.quantity,
        delta: item.quantity,
        previousQuantity: 0,
        newQuantity: item.quantity,
        reason: 'AJUSTE',
        note: 'Saldo inicial',
        createdAt: new Date().toISOString(),
      };
      await db.stockMovements.add(movement);
    }
  });

  return item;
}

async function handlePutInventory(
  id: string,
  body: UpdateInventoryItem & { quantity?: number }
): Promise<InventoryItem> {
  const existing = await db.inventory.get(id);
  if (!existing) {
    throw apiError(404, `/api/v1/inventory/${id}`, 'NAO_ENCONTRADO', 'Produto não encontrado.');
  }

  const sku = normalizeSku(body.sku ?? existing.sku);
  await validateSku(sku, id);
  validateInventoryFields({
    name: body.name ?? existing.name,
    category: body.category ?? existing.category,
    warehouseId: body.warehouseId ?? existing.warehouseId,
    minThreshold: body.minThreshold ?? existing.minThreshold,
    unitPrice: body.unitPrice ?? existing.unitPrice,
  });

  const updated: InventoryItem = {
    ...existing,
    sku,
    name: (body.name ?? existing.name).trim(),
    category: body.category ?? existing.category,
    warehouseId: body.warehouseId ?? existing.warehouseId,
    minThreshold: body.minThreshold ?? existing.minThreshold,
    unitPrice: roundMoney(body.unitPrice ?? existing.unitPrice),
    status: deriveInventoryStatus(existing.quantity, body.minThreshold ?? existing.minThreshold),
    updatedAt: new Date(),
  };
  await db.inventory.put(updated);
  return updated;
}

async function handleDeleteInventory(id: string): Promise<void> {
  const existing = await db.inventory.get(id);
  if (!existing) {
    throw apiError(404, `/api/v1/inventory/${id}`, 'NAO_ENCONTRADO', 'Produto não encontrado.');
  }
  await db.inventory.delete(id);
}

async function handleRestoreInventory(body: InventoryItem): Promise<InventoryItem> {
  const existingBySku = await db.inventory
    .filter((item) => item.sku.toUpperCase() === body.sku.toUpperCase() && item.id !== body.id)
    .first();
  if (existingBySku) {
    throw apiError(
      409,
      '/api/v1/inventory/restore',
      'SKU_DUPLICADO',
      'O SKU já está em uso por outro produto.'
    );
  }

  const restored: InventoryItem = {
    ...body,
    quantity: Math.max(0, Math.trunc(body.quantity)),
    minThreshold: Math.max(0, Math.trunc(body.minThreshold)),
    unitPrice: roundMoney(body.unitPrice),
    status: deriveInventoryStatus(body.quantity, body.minThreshold),
    updatedAt: new Date(),
  };
  await db.inventory.put(restored);
  return restored;
}

async function handleGetMovements(id: string, limit: number): Promise<StockMovement[]> {
  const item = await db.inventory.get(id);
  if (!item) {
    throw apiError(404, `/api/v1/inventory/${id}`, 'NAO_ENCONTRADO', 'Produto não encontrado.');
  }
  const movements = await db.stockMovements.where('itemId').equals(id).toArray();
  return movements
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.min(100, Math.max(1, limit)));
}

async function handlePostMovement(
  id: string,
  input: StockMovementInput
): Promise<StockMovementResult> {
  const item = await db.inventory.get(id);
  if (!item) {
    throw apiError(404, `/api/v1/inventory/${id}`, 'NAO_ENCONTRADO', 'Produto não encontrado.');
  }

  const allowedReasons = STOCK_MOVEMENT_REASONS[input.type];
  if (!allowedReasons?.includes(input.reason)) {
    throw apiError(422, `/api/v1/inventory/${id}/movements`, 'MOTIVO_INVALIDO', 'Motivo inválido para o tipo escolhido.');
  }
  if (input.note && input.note.length > 200) {
    throw apiError(422, `/api/v1/inventory/${id}/movements`, 'VALIDACAO', 'A observação deve ter até 200 caracteres.');
  }

  const quantity = Math.trunc(input.quantity);
  if (!Number.isInteger(input.quantity)) {
    throw apiError(422, `/api/v1/inventory/${id}/movements`, 'VALIDACAO', 'Informe uma quantidade inteira.');
  }

  let newQuantity = item.quantity;
  if (input.type === 'IN') {
    if (quantity <= 0) {
      throw apiError(422, `/api/v1/inventory/${id}/movements`, 'VALIDACAO', 'A entrada deve ser maior que zero.');
    }
    newQuantity = item.quantity + quantity;
  } else if (input.type === 'OUT') {
    if (quantity <= 0) {
      throw apiError(422, `/api/v1/inventory/${id}/movements`, 'VALIDACAO', 'A saída deve ser maior que zero.');
    }
    newQuantity = item.quantity - quantity;
    if (newQuantity < 0) {
      throw apiError(
        422,
        `/api/v1/inventory/${id}/movements`,
        'ESTOQUE_INSUFICIENTE',
        `Saldo insuficiente. Disponível: ${item.quantity}.`
      );
    }
  } else {
    if (quantity < 0) {
      throw apiError(422, `/api/v1/inventory/${id}/movements`, 'VALIDACAO', 'O saldo contado não pode ser negativo.');
    }
    newQuantity = quantity;
    if (newQuantity === item.quantity) {
      throw apiError(
        422,
        `/api/v1/inventory/${id}/movements`,
        'SEM_ALTERACAO',
        'O saldo informado é igual ao atual.'
      );
    }
  }

  const updatedItem: InventoryItem = {
    ...item,
    quantity: newQuantity,
    status: deriveInventoryStatus(newQuantity, item.minThreshold),
    updatedAt: new Date(),
  };
  const movement: StockMovement = {
    id: crypto.randomUUID(),
    itemId: item.id,
    sku: item.sku,
    itemName: item.name,
    warehouseId: item.warehouseId,
    type: input.type,
    quantity: input.type === 'ADJUSTMENT' ? quantity : quantity,
    delta: newQuantity - item.quantity,
    previousQuantity: item.quantity,
    newQuantity,
    reason: input.reason,
    note: input.note?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  await db.transaction('rw', db.inventory, db.stockMovements, async () => {
    await db.inventory.put(updatedItem);
    await db.stockMovements.add(movement);
  });

  return { movement, item: updatedItem };
}

// ─────────────────────────────────────────────
// TREASURY
// ─────────────────────────────────────────────

async function buildTreasurySummary(): Promise<TreasurySummary> {
  const all = await db.transactions.toArray();
  const now = new Date();
  const completed = all.filter((transaction) => transaction.status === 'COMPLETED');
  const realizedIncome = roundMoney(
    completed.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0)
  );
  const realizedExpense = roundMoney(
    completed.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0)
  );

  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = getMonthDate(now, index - 5);
    const key = monthKey(date);
    const rows = completed.filter((transaction) => {
      const effective = new Date(transaction.paymentDate ?? transaction.dueDate);
      return monthKey(effective) === key;
    });
    const income = roundMoney(
      rows.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0)
    );
    const expense = roundMoney(
      rows.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0)
    );
    return { month: key, income, expense, balance: roundMoney(income - expense) };
  });

  const totalReceivables = roundMoney(
    all.filter((t) => t.type === 'INCOME' && t.status !== 'CANCELLED').reduce((sum, t) => sum + t.amount, 0)
  );
  const totalPayables = roundMoney(
    all.filter((t) => t.type === 'EXPENSE' && t.status !== 'CANCELLED').reduce((sum, t) => sum + t.amount, 0)
  );

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const pending = all.filter((transaction) => transaction.status === 'PENDING');
  const overdue: TreasuryTransaction[] = [];
  const dueToday: TreasuryTransaction[] = [];
  const next7: TreasuryTransaction[] = [];
  const next30: TreasuryTransaction[] = [];
  const upcoming30 = {
    receivables: 0,
    payables: 0,
    receivableCount: 0,
    payableCount: 0,
  };

  for (const transaction of pending) {
    const due = new Date(transaction.dueDate);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
    const diff = Math.round((dueDay - today) / DAY);

    if (diff < 0) overdue.push(transaction);
    else if (diff === 0) dueToday.push(transaction);
    else if (diff <= 7) next7.push(transaction);
    else if (diff <= 30) next30.push(transaction);

    if (diff <= 30) {
      if (transaction.type === 'INCOME') {
        upcoming30.receivables += transaction.amount;
        upcoming30.receivableCount += 1;
      } else {
        upcoming30.payables += transaction.amount;
        upcoming30.payableCount += 1;
      }
    }
  }

  return {
    totalReceivables,
    totalPayables,
    totalBalance: roundMoney(realizedIncome - realizedExpense),
    totalItems: all.length,
    aging: { overdue, today: dueToday, next7, next30 },
    realized: {
      income: realizedIncome,
      expense: realizedExpense,
      balance: roundMoney(realizedIncome - realizedExpense),
    },
    monthly,
    upcoming30: {
      receivables: roundMoney(upcoming30.receivables),
      payables: roundMoney(upcoming30.payables),
      receivableCount: upcoming30.receivableCount,
      payableCount: upcoming30.payableCount,
    },
    lastMonth: monthly.length >= 2 ? monthly[monthly.length - 2] : null,
  };
}

async function handleGetTreasury(params: {
  get(name: string): string | null;
}): Promise<PaginatedResponse<TreasuryTransaction>> {
  const search = (params.get('search') ?? '').trim().toLowerCase();
  const type = params.get('type');
  const status = params.get('status');
  const category = params.get('category');
  const page = intParam(params.get('page'), 1, 1, 100_000);
  const limit = intParam(params.get('limit'), 20, 1, 1000);
  const sortBy = (params.get('sortBy') ?? 'dueDate') as keyof TreasuryTransaction;
  const sortOrder = params.get('sortOrder') === 'desc' ? 'desc' : 'asc';

  let items = await db.transactions.toArray();
  if (search) {
    items = items.filter(
      (transaction) =>
        transaction.description.toLowerCase().includes(search) ||
        transaction.partnerName.toLowerCase().includes(search)
    );
  }
  if (type && type !== 'ALL') items = items.filter((transaction) => transaction.type === type);
  if (status && status !== 'ALL') {
    items = items.filter((transaction) => transaction.status === status);
  }
  if (category && category !== 'ALL') {
    items = items.filter((transaction) => transaction.category === category);
  }

  const sorted = sortByKey(items, sortBy, sortOrder);
  const response = paginate(sorted, page, limit);
  return {
    ...response,
    summary: {
      totalStockValue: 0,
      lowStockCount: 0,
    },
  };
}

async function handlePostTreasury(body: TransactionInput): Promise<TreasuryTransaction> {
  if (!body.description?.trim() || !Number.isFinite(body.amount) || body.amount <= 0) {
    throw apiError(422, '/api/v1/treasury', 'VALIDACAO', 'Informe descrição e valor válidos.');
  }
  const transaction: TreasuryTransaction = {
    ...body,
    id: crypto.randomUUID(),
    description: body.description.trim(),
    amount: roundMoney(body.amount),
    status: 'PENDING',
    dueDate: body.dueDate,
  };
  await db.transactions.add(transaction);
  return transaction;
}

async function handleUpdateTreasuryStatus(
  id: string,
  status: TransactionStatus
): Promise<TreasuryTransaction> {
  const existing = await db.transactions.get(id);
  if (!existing) {
    throw apiError(404, `/api/v1/treasury/${id}`, 'NAO_ENCONTRADO', 'Transação não encontrada.');
  }
  if (!['PENDING', 'COMPLETED', 'CANCELLED'].includes(status)) {
    throw apiError(422, `/api/v1/treasury/${id}/status`, 'VALIDACAO', 'Status inválido.');
  }
  const updated: TreasuryTransaction = {
    ...existing,
    status,
    paymentDate:
      status === 'COMPLETED'
        ? existing.paymentDate ?? new Date().toISOString()
        : status === 'PENDING'
          ? undefined
          : existing.paymentDate,
  };
  await db.transactions.put(updated);
  return updated;
}

// ─────────────────────────────────────────────
// PARTNERS
// ─────────────────────────────────────────────

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePartnerInput(input: PartnerInput): void {
  if (!isValidCnpj(input.cnpj)) {
    throw apiError(422, '/api/v1/partners', 'CNPJ_INVALIDO', 'Informe um CNPJ válido.');
  }
  if (!input.companyName || input.companyName.trim().length < 3 || input.companyName.trim().length > 120) {
    throw apiError(422, '/api/v1/partners', 'VALIDACAO', 'A razão social deve ter entre 3 e 120 caracteres.');
  }
  if (input.tradeName && input.tradeName.length > 120) {
    throw apiError(422, '/api/v1/partners', 'VALIDACAO', 'O nome fantasia deve ter até 120 caracteres.');
  }
  if (!PARTNER_CATEGORIES.includes(input.category)) {
    throw apiError(422, '/api/v1/partners', 'VALIDACAO', 'Categoria inválida.');
  }
  if (!BRAZILIAN_STATES.includes(input.state as (typeof BRAZILIAN_STATES)[number])) {
    throw apiError(422, '/api/v1/partners', 'VALIDACAO', 'UF inválida.');
  }
  if (!Number.isFinite(input.creditLimit) || input.creditLimit < 0) {
    throw apiError(422, '/api/v1/partners', 'VALIDACAO', 'O limite de crédito deve ser maior ou igual a zero.');
  }
  if (input.email && !EMAIL_PATTERN.test(input.email)) {
    throw apiError(422, '/api/v1/partners', 'VALIDACAO', 'Informe um e-mail válido.');
  }
  const phoneDigits = (input.phone ?? '').replace(/\D/g, '');
  if (input.phone && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
    throw apiError(422, '/api/v1/partners', 'VALIDACAO', 'Informe um telefone com 10 ou 11 dígitos.');
  }
  if (input.contactName && input.contactName.length > 80) {
    throw apiError(422, '/api/v1/partners', 'VALIDACAO', 'O contato deve ter até 80 caracteres.');
  }
}

async function ensureUniquePartnerCnpj(cnpj: string, exceptId?: string): Promise<void> {
  const digits = normalizeCnpj(cnpj);
  const existing = await db.partners
    .filter((partner) => normalizeCnpj(partner.cnpj) === digits && partner.id !== exceptId)
    .first();
  if (existing) {
    throw apiError(
      409,
      '/api/v1/partners',
      'CNPJ_DUPLICADO',
      'Já existe um parceiro com este CNPJ.'
    );
  }
}

async function handleGetPartners(params: {
  get(name: string): string | null;
}): Promise<B2BPartner[]> {
  const search = (params.get('search') ?? '').trim().toLowerCase();
  const digits = normalizeCnpj(search);
  let items = await db.partners.toArray();
  if (search) {
    items = items.filter(
      (partner) =>
        partner.companyName.toLowerCase().includes(search) ||
        (partner.tradeName ?? '').toLowerCase().includes(search) ||
        (partner.email ?? '').toLowerCase().includes(search) ||
        (digits.length > 0 && normalizeCnpj(partner.cnpj).includes(digits))
    );
  }
  return items.sort((a, b) => a.companyName.localeCompare(b.companyName, 'pt-BR'));
}

async function handlePostPartner(body: PartnerInput): Promise<B2BPartner> {
  validatePartnerInput(body);
  await ensureUniquePartnerCnpj(body.cnpj);

  const existing = await db.partners.toArray();
  const maxSequence = existing.reduce((max, partner) => {
    const match = /^PART-(\d{3})/.exec(partner.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  const now = new Date().toISOString();
  const partner: B2BPartner = {
    id: `PART-${String(maxSequence + 1).padStart(3, '0')}`,
    cnpj: formatCnpj(body.cnpj),
    companyName: body.companyName.trim(),
    tradeName: body.tradeName?.trim() || undefined,
    category: body.category,
    status: 'EM_ANALISE',
    creditLimit: roundMoney(body.creditLimit),
    creditUsed: 0,
    state: body.state,
    contactName: body.contactName?.trim() || undefined,
    email: body.email?.trim() || undefined,
    phone: body.phone?.trim() || undefined,
    statusUpdatedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await db.partners.add(partner);
  return partner;
}

async function handlePutPartner(id: string, body: PartnerInput): Promise<B2BPartner> {
  const existing = await db.partners.get(id);
  if (!existing) {
    throw apiError(404, `/api/v1/partners/${id}`, 'NAO_ENCONTRADO', 'Parceiro não encontrado.');
  }
  validatePartnerInput(body);
  await ensureUniquePartnerCnpj(body.cnpj, id);

  const updated: B2BPartner = {
    ...existing,
    cnpj: formatCnpj(body.cnpj),
    companyName: body.companyName.trim(),
    tradeName: body.tradeName?.trim() || undefined,
    category: body.category,
    creditLimit: roundMoney(body.creditLimit),
    state: body.state,
    contactName: body.contactName?.trim() || undefined,
    email: body.email?.trim() || undefined,
    phone: body.phone?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  await db.partners.put(updated);
  return updated;
}

async function handleChangePartnerStatus(
  id: string,
  status: PartnerStatus,
  reason?: string
): Promise<B2BPartner> {
  const existing = await db.partners.get(id);
  if (!existing) {
    throw apiError(404, `/api/v1/partners/${id}`, 'NAO_ENCONTRADO', 'Parceiro não encontrado.');
  }
  if (!PARTNER_STATUS_TRANSITIONS[existing.status].includes(status)) {
    throw apiError(
      422,
      `/api/v1/partners/${id}/status`,
      'TRANSICAO_INVALIDA',
      'Transição de status não permitida.'
    );
  }
  if (status === 'BLOQUEADO' && !reason?.trim()) {
    throw apiError(
      422,
      `/api/v1/partners/${id}/status`,
      'VALIDACAO',
      'Informe o motivo do bloqueio.'
    );
  }

  const now = new Date().toISOString();
  const updated: B2BPartner = {
    ...existing,
    status,
    statusReason: reason?.trim() || undefined,
    statusUpdatedAt: now,
    updatedAt: now,
  };
  await db.partners.put(updated);
  return updated;
}

async function handleDeletePartner(id: string): Promise<void> {
  const existing = await db.partners.get(id);
  if (!existing) {
    throw apiError(404, `/api/v1/partners/${id}`, 'NAO_ENCONTRADO', 'Parceiro não encontrado.');
  }
  const transaction = await db.transactions.where('partnerId').equals(id).first();
  if (transaction) {
    throw apiError(
      409,
      `/api/v1/partners/${id}`,
      'PARCEIRO_COM_TRANSACOES',
      'Este parceiro possui transações vinculadas e não pode ser excluído.'
    );
  }
  if (existing.creditUsed > 0) {
    throw apiError(
      409,
      `/api/v1/partners/${id}`,
      'PARCEIRO_COM_CREDITO',
      'Este parceiro possui crédito utilizado e não pode ser excluído.'
    );
  }
  await db.partners.delete(id);
}

// ─────────────────────────────────────────────
// ROUTING
// ─────────────────────────────────────────────

function remainder(url: string, prefix: string): string {
  return url.split('?')[0].slice(prefix.length).replace(/^\/+/, '');
}

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  const cleanUrl = req.url.split('?')[0];
  const isInventory = cleanUrl.startsWith(INVENTORY_PREFIX);
  const isTreasury = cleanUrl.startsWith(TREASURY_PREFIX);
  const isPartners = cleanUrl.startsWith(PARTNERS_PREFIX);

  if (!isInventory && !isTreasury && !isPartners) {
    return next(req);
  }

  const devResilience = inject(DevResilienceService);
  const simulatedDelay = getSimulatedLatency(devResilience.slowLatency());

  if (shouldSimulateError(req.headers, devResilience.simulateError())) {
    return of(null).pipe(
      delay(simulatedDelay),
      switchMap(() => throwError(() => createErrorResponse(req.url)))
    );
  }

  let response$: Observable<HttpResponse<unknown>>;

  if (isInventory) {
    const rest = remainder(cleanUrl, INVENTORY_PREFIX);
    const segments = rest ? rest.split('/') : [];

    if (req.method === 'GET' && rest === 'summary') {
      response$ = handle(() => buildInventorySummary());
    } else if (req.method === 'POST' && rest === 'restore') {
      response$ = handle(
        () => handleRestoreInventory(req.body as InventoryItem),
        201
      );
    } else if (req.method === 'GET' && segments.length === 2 && segments[1] === 'movements') {
      const limit = intParam(req.params.get('limit'), 20, 1, 100);
      response$ = handle(() => handleGetMovements(segments[0], limit));
    } else if (req.method === 'POST' && segments.length === 2 && segments[1] === 'movements') {
      response$ = handle(
        () => handlePostMovement(segments[0], req.body as StockMovementInput),
        201
      );
    } else if (req.method === 'GET' && !rest) {
      response$ = handle(() => handleGetInventory(req.params));
    } else if (req.method === 'POST' && !rest) {
      response$ = handle(
        () => handlePostInventory(req.body as CreateInventoryItem),
        201
      );
    } else if (req.method === 'PUT' && segments.length === 1) {
      response$ = handle(
        () => handlePutInventory(segments[0], req.body as UpdateInventoryItem)
      );
    } else if (req.method === 'DELETE' && segments.length === 1) {
      response$ = handle(async () => {
        await handleDeleteInventory(segments[0]);
        return null;
      }, 204);
    } else {
      return next(req);
    }
  } else if (isTreasury) {
    const rest = remainder(cleanUrl, TREASURY_PREFIX);
    const segments = rest ? rest.split('/') : [];

    if (req.method === 'GET' && rest === 'summary') {
      response$ = handle(() => buildTreasurySummary());
    } else if (req.method === 'PATCH' && segments.length === 2 && segments[1] === 'status') {
      const body = req.body as { status: TransactionStatus };
      response$ = handle(() => handleUpdateTreasuryStatus(segments[0], body.status));
    } else if (req.method === 'GET' && !rest) {
      response$ = handle(() => handleGetTreasury(req.params));
    } else if (req.method === 'POST' && !rest) {
      response$ = handle(
        () => handlePostTreasury(req.body as TransactionInput),
        201
      );
    } else {
      return next(req);
    }
  } else {
    const rest = remainder(cleanUrl, PARTNERS_PREFIX);
    const segments = rest ? rest.split('/') : [];

    if (req.method === 'GET' && !rest) {
      response$ = handle(() => handleGetPartners(req.params));
    } else if (req.method === 'POST' && !rest) {
      response$ = handle(
        () => handlePostPartner(req.body as PartnerInput),
        201
      );
    } else if (req.method === 'PATCH' && segments.length === 2 && segments[1] === 'status') {
      const body = req.body as { status: PartnerStatus; reason?: string };
      response$ = handle(() =>
        handleChangePartnerStatus(segments[0], body.status, body.reason)
      );
    } else if (req.method === 'PUT' && segments.length === 1) {
      response$ = handle(() =>
        handlePutPartner(segments[0], req.body as PartnerInput)
      );
    } else if (req.method === 'DELETE' && segments.length === 1) {
      response$ = handle(async () => {
        await handleDeletePartner(segments[0]);
        return null;
      }, 204);
    } else {
      return next(req);
    }
  }

  return response$.pipe(delay(simulatedDelay));
};
