import Dexie, { type Table } from 'dexie';
import type { InventoryItem } from '@/core/models/inventory.model';
import type { TreasuryTransaction } from '@/core/models/treasury.model';

export class AppDatabase extends Dexie {
  readonly inventory!: Table<InventoryItem, string>;
  readonly transactions!: Table<TreasuryTransaction, string>;

  constructor() {
    super('AxiomERP');

    this.version(2).stores({
      inventory: 'id, sku, name, category, status, warehouseId, updatedAt',
      transactions: 'id, type, status, category, partnerId, dueDate',
    });
  }
}

export const db = new AppDatabase();
