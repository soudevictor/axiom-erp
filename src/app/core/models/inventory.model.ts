export type InventoryCategory =
  | 'ELECTRONICS'
  | 'HARDWARE'
  | 'LOGISTICS'
  | 'OFFICE';

export type InventoryStatus =
  | 'IN_STOCK'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK';

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
  readonly page: number;
  readonly limit: number;
  readonly sortBy: keyof InventoryItem;
  readonly sortOrder: 'asc' | 'desc';
}

export const INVENTORY_CATEGORIES: readonly InventoryCategory[] = [
  'ELECTRONICS',
  'HARDWARE',
  'LOGISTICS',
  'OFFICE',
] as const;

export const INVENTORY_STATUSES: readonly InventoryStatus[] = [
  'IN_STOCK',
  'LOW_STOCK',
  'OUT_OF_STOCK',
] as const;

export const DEFAULT_INVENTORY_FILTER: InventoryFilter = {
  search: '',
  category: null,
  status: null,
  page: 1,
  limit: 20,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
};
