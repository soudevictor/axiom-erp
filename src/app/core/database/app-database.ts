import Dexie, { type Table } from 'dexie';
import type { InventoryItem } from '@/core/models/inventory.model';
import type { TreasuryTransaction } from '@/core/models/treasury.model';
import type { B2BPartner } from '@/core/models/partner.model';
import type { StockMovement } from '@/core/models/stock-movement.model';

export class AppDatabase extends Dexie {
  readonly inventory!: Table<InventoryItem, string>;
  readonly transactions!: Table<TreasuryTransaction, string>;
  readonly partners!: Table<B2BPartner, string>;
  readonly stockMovements!: Table<StockMovement, string>;

  constructor() {
    super('AxiomERP');

    this.version(2).stores({
      inventory: 'id, sku, name, category, status, warehouseId, updatedAt',
      transactions: 'id, type, status, category, partnerId, dueDate',
    });

    this.version(3).stores({
      inventory: 'id, sku, name, category, status, warehouseId, updatedAt',
      transactions: 'id, type, status, category, partnerId, dueDate',
      partners: 'id, cnpj, companyName, category, status',
    });

    this.version(4).stores({
      inventory: 'id, sku, name, category, status, warehouseId, updatedAt',
      transactions: 'id, type, status, category, partnerId, dueDate',
      partners: 'id, cnpj, companyName, category, status',
      stockMovements: 'id, itemId, [itemId+createdAt], sku, type, createdAt',
    });
  }
}

export const db = new AppDatabase();
