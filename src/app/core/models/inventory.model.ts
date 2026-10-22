import type { Warehouse } from './warehouse.model';

export type InventoryCategory = 'ELECTRONICS' | 'HARDWARE' | 'LOGISTICS' | 'OFFICE';

export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface InventoryItem {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly category: InventoryCategory;
  readonly warehouseId: string;
  readonly quantity: number;
  readonly minThreshold: number;
  readonly unitPrice: number;
  readonly status: InventoryStatus;
  readonly updatedAt: Date;
}

export interface InventoryFilter {
  readonly search: string;
  readonly category: InventoryCategory | null;
  readonly status: InventoryStatus | null;
  readonly warehouseId: string | null;
  readonly page: number;
  readonly limit: number;
  readonly sortBy: keyof InventoryItem;
  readonly sortOrder: 'asc' | 'desc';
}

export interface CreateInventoryItem {
  readonly sku: string;
  readonly name: string;
  readonly category: InventoryCategory;
  readonly warehouseId: string;
  readonly quantity: number;
  readonly minThreshold: number;
  readonly unitPrice: number;
}

export type UpdateInventoryItem = Omit<CreateInventoryItem, 'quantity'>;

export interface InventorySummary {
  readonly totalSkus: number;
  readonly totalUnits: number;
  readonly totalStockValue: number;
  readonly inStockCount: number;
  readonly lowStockCount: number;
  readonly outOfStockCount: number;
  readonly movementsLast30Days: number;
  readonly lastMovementAt: string | null;
  readonly byWarehouse: readonly WarehouseSummary[];
  readonly byCategory: readonly CategorySummary[];
  readonly criticalItems: readonly CriticalInventoryItem[];
}

export interface WarehouseSummary {
  readonly warehouseId: string;
  readonly skus: number;
  readonly units: number;
  readonly value: number;
}

export interface CategorySummary {
  readonly category: InventoryCategory;
  readonly skus: number;
  readonly units: number;
  readonly value: number;
}

export interface CriticalInventoryItem {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly quantity: number;
  readonly minThreshold: number;
  readonly warehouseId: string;
}

export const INVENTORY_CATEGORIES: readonly InventoryCategory[] = [
  'ELECTRONICS',
  'HARDWARE',
  'LOGISTICS',
  'OFFICE',
] as const;

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  ELECTRONICS: 'Eletrônicos',
  HARDWARE: 'Ferramentas',
  LOGISTICS: 'Logística',
  OFFICE: 'Escritório',
};

export const INVENTORY_STATUSES: readonly InventoryStatus[] = [
  'IN_STOCK',
  'LOW_STOCK',
  'OUT_OF_STOCK',
] as const;

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  IN_STOCK: 'Em estoque',
  LOW_STOCK: 'Baixo',
  OUT_OF_STOCK: 'Zerado',
};

export const DEFAULT_INVENTORY_FILTER: InventoryFilter = {
  search: '',
  category: null,
  status: null,
  warehouseId: null,
  page: 1,
  limit: 20,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
};

export function deriveInventoryStatus(quantity: number, minThreshold: number): InventoryStatus {
  if (quantity === 0) return 'OUT_OF_STOCK';
  if (quantity <= minThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export function inventoryItemValue(item: Pick<InventoryItem, 'quantity' | 'unitPrice'>): number {
  return Math.round(item.quantity * item.unitPrice * 100) / 100;
}

export type { Warehouse };
