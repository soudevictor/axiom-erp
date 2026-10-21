import type { InventoryItem } from './inventory.model';

export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export type StockMovementReason =
  | 'COMPRA'
  | 'DEVOLUCAO'
  | 'VENDA'
  | 'PERDA'
  | 'AVARIA'
  | 'USO_INTERNO'
  | 'INVENTARIO'
  | 'AJUSTE';

export interface StockMovement {
  readonly id: string;
  readonly itemId: string;
  readonly sku: string;
  readonly itemName: string;
  readonly warehouseId: string;
  readonly type: StockMovementType;
  readonly quantity: number;
  readonly delta: number;
  readonly previousQuantity: number;
  readonly newQuantity: number;
  readonly reason: StockMovementReason;
  readonly note?: string;
  readonly createdAt: string;
}

export interface StockMovementInput {
  readonly type: StockMovementType;
  readonly quantity: number;
  readonly reason: StockMovementReason;
  readonly note?: string;
}

export interface StockMovementResult {
  readonly movement: StockMovement;
  readonly item: InventoryItem;
}

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  IN: 'Entrada',
  OUT: 'Saída',
  ADJUSTMENT: 'Ajuste',
};

export const STOCK_MOVEMENT_REASON_LABELS: Record<StockMovementReason, string> = {
  COMPRA: 'Compra',
  DEVOLUCAO: 'Devolução',
  VENDA: 'Venda',
  PERDA: 'Perda',
  AVARIA: 'Avaria',
  USO_INTERNO: 'Uso interno',
  INVENTARIO: 'Inventário',
  AJUSTE: 'Ajuste',
};

export const STOCK_MOVEMENT_REASONS: Record<StockMovementType, readonly StockMovementReason[]> = {
  IN: ['COMPRA', 'DEVOLUCAO', 'AJUSTE'],
  OUT: ['VENDA', 'PERDA', 'AVARIA', 'USO_INTERNO'],
  ADJUSTMENT: ['INVENTARIO', 'AJUSTE'],
};
