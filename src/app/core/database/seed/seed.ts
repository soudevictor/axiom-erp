import { db } from '@/core/database/app-database';
import type { InventoryItem } from '@/core/models/inventory.model';
import type { StockMovement } from '@/core/models/stock-movement.model';
import { buildInventory } from './seed-inventory';
import { buildMovements } from './seed-movements';
import { buildPartners } from './seed-partners';
import { buildTransactions } from './seed-transactions';

export interface SeedCounts {
  readonly inventory: number;
  readonly transactions: number;
  readonly partners: number;
  readonly stockMovements: number;
}

export interface SeedBundle {
  readonly inventory: readonly InventoryItem[];
  readonly transactions: ReturnType<typeof buildTransactions>;
  readonly partners: ReturnType<typeof buildPartners>;
  readonly stockMovements: readonly StockMovement[];
}

export function buildSeedBundle(now: Date = new Date()): SeedBundle {
  const partners = buildPartners(now);
  const inventory = buildInventory(now);
  const transactions = buildTransactions(now, partners);
  const stockMovements = buildMovements(inventory, now);

  const latestByItem = new Map<string, string>();
  for (const movement of stockMovements) {
    const current = latestByItem.get(movement.itemId);
    if (!current || movement.createdAt > current) {
      latestByItem.set(movement.itemId, movement.createdAt);
    }
  }

  const inventoryWithMovementDates = inventory.map((item) => {
    const last = latestByItem.get(item.id);
    return last ? { ...item, updatedAt: new Date(last) } : item;
  });

  return {
    inventory: inventoryWithMovementDates,
    transactions,
    partners,
    stockMovements,
  };
}

export async function seedAll(now: Date = new Date()): Promise<SeedCounts> {
  const bundle = buildSeedBundle(now);

  await db.transaction(
    'rw',
    db.inventory,
    db.transactions,
    db.partners,
    db.stockMovements,
    async () => {
      await db.partners.bulkAdd([...bundle.partners]);
      await db.inventory.bulkAdd([...bundle.inventory]);
      await db.transactions.bulkAdd([...bundle.transactions]);
      await db.stockMovements.bulkAdd([...bundle.stockMovements]);
    }
  );

  return {
    inventory: bundle.inventory.length,
    transactions: bundle.transactions.length,
    partners: bundle.partners.length,
    stockMovements: bundle.stockMovements.length,
  };
}

export async function seedMissingTables(now: Date = new Date()): Promise<SeedCounts> {
  const [inventoryCount, transactionCount, partnerCount, movementCount] = await Promise.all([
    db.inventory.count(),
    db.transactions.count(),
    db.partners.count(),
    db.stockMovements.count(),
  ]);

  const partners = partnerCount === 0 ? buildPartners(now) : await db.partners.toArray();
  const inventory = inventoryCount === 0 ? buildInventory(now) : await db.inventory.toArray();
  const transactions =
    transactionCount === 0 ? buildTransactions(now, partners) : await db.transactions.toArray();
  const stockMovements =
    movementCount === 0 ? buildMovements(inventory, now) : await db.stockMovements.toArray();

  if (partnerCount === 0) await db.partners.bulkAdd([...partners]);
  if (inventoryCount === 0) await db.inventory.bulkAdd([...inventory]);
  if (transactionCount === 0) await db.transactions.bulkAdd([...transactions]);
  if (movementCount === 0) await db.stockMovements.bulkAdd([...stockMovements]);

  return {
    inventory: inventory.length,
    transactions: transactions.length,
    partners: partners.length,
    stockMovements: stockMovements.length,
  };
}
