import Dexie, { type Table } from 'dexie';
import type { InventoryItem } from '@/core/models/inventory.model';
import type { TreasuryTransaction } from '@/core/models/treasury.model';
import type { B2BPartner } from '@/features/partners/partners.component';

export class AppDatabase extends Dexie {
  readonly inventory!: Table<InventoryItem, string>;
  readonly transactions!: Table<TreasuryTransaction, string>;
  readonly partners!: Table<B2BPartner, string>;

  constructor() {
    super('AxiomERP');

    this.version(2).stores({
      inventory: 'id, sku, name, category, status, warehouseId, updatedAt',
      transactions: 'id, type, status, category, partnerId, dueDate',
    });

    // Version 3: adds partners table
    this.version(3).stores({
      inventory: 'id, sku, name, category, status, warehouseId, updatedAt',
      transactions: 'id, type, status, category, partnerId, dueDate',
      partners: 'id, cnpj, companyName, category, status',
    });
  }
}

export const db = new AppDatabase();
