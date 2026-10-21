import { Injectable } from '@angular/core';
import { db } from '@/core/database/app-database';
import { seedAll, seedMissingTables, type SeedCounts } from './seed/seed';
import { buildInventory } from './seed/seed-inventory';
import { buildPartners } from './seed/seed-partners';
import { buildTransactions } from './seed/seed-transactions';

@Injectable({ providedIn: 'root' })
export class DatabaseSeedService {
  /** Populates only empty tables; never overwrites data already in the browser. */
  async initialize(): Promise<SeedCounts> {
    return seedMissingTables();
  }

  async seedInventory(): Promise<void> {
    if ((await db.inventory.count()) === 0) {
      await db.inventory.bulkAdd(buildInventory());
    }
  }

  async seedTransactions(): Promise<void> {
    if ((await db.transactions.count()) === 0) {
      const partners =
        (await db.partners.count()) > 0 ? await db.partners.toArray() : buildPartners();
      if ((await db.partners.count()) === 0) await db.partners.bulkAdd(partners);
      await db.transactions.bulkAdd(buildTransactions(new Date(), partners));
    }
  }

  async resetDatabase(): Promise<SeedCounts> {
    await db.transaction(
      'rw',
      db.transactions,
      db.partners,
      db.inventory,
      db.stockMovements,
      async () => {
        await db.transactions.clear();
        await db.partners.clear();
        await db.inventory.clear();
        await db.stockMovements.clear();
      }
    );
    return seedAll();
  }

  async reset(): Promise<SeedCounts> {
    return this.resetDatabase();
  }
}
