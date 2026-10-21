import type { InventoryItem } from '@/core/models/inventory.model';
import type {
  StockMovement,
  StockMovementReason,
  StockMovementType,
} from '@/core/models/stock-movement.model';
import { SEED } from './catalog';
import { int, mulberry32, pick } from './prng';

const DAY = 86_400_000;

const REASONS: Record<StockMovementType, readonly StockMovementReason[]> = {
  IN: ['COMPRA', 'DEVOLUCAO', 'AJUSTE'],
  OUT: ['VENDA', 'PERDA', 'AVARIA', 'USO_INTERNO'],
  ADJUSTMENT: ['INVENTARIO', 'AJUSTE'],
};

function movementType(rng: () => number): StockMovementType {
  const roll = rng();
  if (roll < 0.55) return 'OUT';
  if (roll < 0.9) return 'IN';
  return 'ADJUSTMENT';
}

export function buildMovements(
  items: readonly InventoryItem[],
  now: Date = new Date(),
  seed = SEED
): StockMovement[] {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const movements: StockMovement[] = [];
  let sequence = 0;

  for (const item of items) {
    const roll = rng();
    const count = roll < 0.4 ? 1 : roll < 0.5 ? 2 : 0;
    if (count === 0) continue;

    let current = item.quantity;
    const drafts: Omit<StockMovement, 'id' | 'createdAt'>[] = [];

    for (let index = count - 1; index >= 0; index -= 1) {
      const type = movementType(rng);
      let previousQuantity = current;
      let delta = 0;

      if (type === 'OUT') {
        const quantity = int(rng, 1, Math.max(20, Math.min(250, current + 80)));
        previousQuantity = current + quantity;
        delta = -quantity;
      } else if (type === 'IN') {
        const requested = int(rng, 1, 180);
        if (current === 0) {
          previousQuantity = requested;
          delta = -requested;
          drafts.push({
            itemId: item.id,
            sku: item.sku,
            itemName: item.name,
            warehouseId: item.warehouseId,
            type: 'ADJUSTMENT',
            quantity: requested,
            delta,
            previousQuantity,
            newQuantity: 0,
            reason: 'INVENTARIO',
            note: 'Contagem cíclica',
          });
          current = previousQuantity;
          continue;
        }
        previousQuantity = Math.max(0, current - requested);
        delta = current - previousQuantity;
        drafts.push({
          itemId: item.id,
          sku: item.sku,
          itemName: item.name,
          warehouseId: item.warehouseId,
          type: 'IN',
          quantity: delta,
          delta,
          previousQuantity,
          newQuantity: current,
          reason: pick(rng, REASONS.IN),
          note: rng() < 0.25 ? 'Reposição de fornecedor' : undefined,
        });
        current = previousQuantity;
        continue;
      } else {
        const candidate = Math.max(0, current + int(rng, -80, 100));
        previousQuantity = candidate === current ? Math.max(0, current + 10) : candidate;
        delta = current - previousQuantity;
      }

      drafts.push({
        itemId: item.id,
        sku: item.sku,
        itemName: item.name,
        warehouseId: item.warehouseId,
        type: type === 'ADJUSTMENT' ? 'ADJUSTMENT' : type,
        quantity: Math.abs(delta) === 0 ? 0 : Math.abs(delta),
        delta,
        previousQuantity,
        newQuantity: current,
        reason: pick(rng, REASONS[type]),
        note: rng() < 0.25 ? (type === 'OUT' ? 'Separação de pedido' : 'Reposição de fornecedor') : undefined,
      });
      current = previousQuantity;
    }

    const dates = Array.from({ length: drafts.length }, () =>
      new Date(now.getTime() - int(rng, 0, 90) * DAY - int(rng, 0, 23) * 3_600_000)
    ).sort((a, b) => b.getTime() - a.getTime());

    drafts.forEach((draft, index) => {
      sequence += 1;
      movements.push({
        ...draft,
        id: `MOV-${String(sequence).padStart(5, '0')}`,
        createdAt: dates[index].toISOString(),
      });
    });
  }

  return movements;
}
