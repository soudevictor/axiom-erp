import type { InventoryCategory, InventoryItem } from '@/core/models/inventory.model';
import { deriveInventoryStatus } from '@/core/models/inventory.model';
import { WAREHOUSE_IDS } from '@/core/models/warehouse.model';
import {
  INVENTORY_CATEGORY_PREFIX,
  PRODUCT_NAMES,
  PRODUCT_VARIANTS,
  SEED,
  SEED_INVENTORY_COUNT,
} from './catalog';
import { int, mulberry32, pick, roundMoney, shuffled, weighted } from './prng';

const DAY = 86_400_000;
const HOUR = 3_600_000;

const CATEGORY_DISTRIBUTION: readonly InventoryCategory[] = [
  ...Array<InventoryCategory>(150).fill('ELECTRONICS'),
  ...Array<InventoryCategory>(140).fill('HARDWARE'),
  ...Array<InventoryCategory>(110).fill('LOGISTICS'),
  ...Array<InventoryCategory>(100).fill('OFFICE'),
];

const PRICE_RANGES: Record<
  InventoryCategory,
  { readonly min: number; readonly max: number; readonly qtyMin: number; readonly qtyMax: number }
> = {
  ELECTRONICS: { min: 55, max: 650, qtyMin: 33, qtyMax: 340 },
  HARDWARE: { min: 20, max: 210, qtyMin: 65, qtyMax: 740 },
  LOGISTICS: { min: 20, max: 145, qtyMin: 65, qtyMax: 850 },
  OFFICE: { min: 20, max: 100, qtyMin: 65, qtyMax: 740 },
};

export function buildInventory(now: Date = new Date(), seed = SEED): InventoryItem[] {
  const rng = mulberry32(seed);
  const categories = shuffled(rng, CATEGORY_DISTRIBUTION);
  const perCategory = new Map<InventoryCategory, number>();

  return categories.map((category, index) => {
    const categoryIndex = perCategory.get(category) ?? 0;
    perCategory.set(category, categoryIndex + 1);

    const ranges = PRICE_RANGES[category];
    const minThreshold = int(rng, 5, 120);
    const stockRoll = rng();
    const quantity =
      stockRoll < 0.02
        ? 0
        : stockRoll < 0.1
          ? int(rng, 1, minThreshold)
          : int(rng, Math.max(minThreshold + 1, ranges.qtyMin), ranges.qtyMax);

    const baseName = pick(rng, PRODUCT_NAMES[category]);
    const variant = pick(rng, PRODUCT_VARIANTS);
    const warehouseId = weighted(rng, [
      { value: WAREHOUSE_IDS[0], weight: 30 },
      { value: WAREHOUSE_IDS[1], weight: 22 },
      { value: WAREHOUSE_IDS[2], weight: 18 },
      { value: WAREHOUSE_IDS[3], weight: 15 },
      { value: WAREHOUSE_IDS[4], weight: 15 },
    ]);
    const updatedAt = new Date(
      now.getTime() - int(rng, 0, 90) * DAY - int(rng, 0, 23) * HOUR
    );

    return {
      id: `INV-${String(index + 1).padStart(4, '0')}`,
      sku: `${INVENTORY_CATEGORY_PREFIX[category]}-A${String(categoryIndex + 1).padStart(
        3,
        '0'
      )}-${String(index + 1).padStart(4, '0')}`,
      name: `${baseName} ${variant}`,
      category,
      warehouseId,
      quantity,
      minThreshold,
      unitPrice: roundMoney(ranges.min + rng() * (ranges.max - ranges.min)),
      status: deriveInventoryStatus(quantity, minThreshold),
      updatedAt,
    } satisfies InventoryItem;
  });
}

export function inventorySeedTotals(items: readonly InventoryItem[]): {
  units: number;
  value: number;
  low: number;
  out: number;
} {
  return items.reduce(
    (totals, item) => ({
      units: totals.units + item.quantity,
      value: totals.value + item.quantity * item.unitPrice,
      low: totals.low + (item.status === 'LOW_STOCK' ? 1 : 0),
      out: totals.out + (item.status === 'OUT_OF_STOCK' ? 1 : 0),
    }),
    { units: 0, value: 0, low: 0, out: 0 }
  );
}

export const INVENTORY_SEED_COUNT = SEED_INVENTORY_COUNT;
