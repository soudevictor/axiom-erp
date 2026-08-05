import Dexie, { type Table } from 'dexie';
import type { InventoryItem } from '@/core/models/inventory.model';

export class AppDatabase extends Dexie {
  readonly inventory!: Table<InventoryItem, string>;

  constructor() {
    super('AxiomERP');

    this.version(1).stores({
      inventory: 'id, sku, category, status, warehouseId, updatedAt',
    });
  }
}

export const db = new AppDatabase();
