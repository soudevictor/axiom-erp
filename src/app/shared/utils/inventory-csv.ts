import {
  INVENTORY_CATEGORY_LABELS,
  INVENTORY_STATUS_LABELS,
  inventoryItemValue,
  type InventoryItem,
} from '@/core/models/inventory.model';
import { WAREHOUSES } from '@/core/models/warehouse.model';
import { exportToCsv } from './csv-exporter';

const CURRENCY = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INTEGER = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

const DATE = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

interface InventoryCsvRow extends Record<string, unknown> {
  readonly sku: string;
  readonly product: string;
  readonly category: string;
  readonly warehouse: string;
  readonly state: string;
  readonly quantity: string;
  readonly minThreshold: string;
  readonly unitPrice: string;
  readonly totalValue: string;
  readonly status: string;
  readonly updatedAt: string;
}

function dateStamp(): string {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

/**
 * Exports the current inventory view using pt-BR labels, semicolon separators
 * and a UTF-8 BOM so Excel opens the file without an import step.
 */
export function exportInventoryCsv(items: readonly InventoryItem[], filename?: string): void {
  const rows: InventoryCsvRow[] = items.map((item) => {
    const warehouse = WAREHOUSES.find((candidate) => candidate.id === item.warehouseId);
    return {
      sku: item.sku,
      product: item.name,
      category: INVENTORY_CATEGORY_LABELS[item.category],
      warehouse: warehouse?.name ?? item.warehouseId,
      state: warehouse?.state ?? '',
      quantity: INTEGER.format(item.quantity),
      minThreshold: INTEGER.format(item.minThreshold),
      unitPrice: CURRENCY.format(item.unitPrice),
      totalValue: CURRENCY.format(inventoryItemValue(item)),
      status: INVENTORY_STATUS_LABELS[item.status],
      updatedAt: DATE.format(item.updatedAt),
    };
  });

  exportToCsv(rows, filename ?? `axiom-estoque-${dateStamp()}`, {
    sku: 'SKU',
    product: 'Produto',
    category: 'Categoria',
    warehouse: 'Armazém',
    state: 'UF',
    quantity: 'Quantidade',
    minThreshold: 'Estoque mínimo',
    unitPrice: 'Preço unitário (R$)',
    totalValue: 'Valor total (R$)',
    status: 'Status',
    updatedAt: 'Atualizado em',
  });
}
