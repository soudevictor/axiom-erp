export const WAREHOUSES = [
  { id: 'WH-SP-001', name: 'São Paulo', state: 'SP' },
  { id: 'WH-RJ-002', name: 'Rio de Janeiro', state: 'RJ' },
  { id: 'WH-MG-003', name: 'Belo Horizonte', state: 'MG' },
  { id: 'WH-PR-004', name: 'Curitiba', state: 'PR' },
  { id: 'WH-RS-005', name: 'Porto Alegre', state: 'RS' },
] as const;

export type Warehouse = (typeof WAREHOUSES)[number];

export const WAREHOUSE_IDS = WAREHOUSES.map((warehouse) => warehouse.id);

export function warehouseLabel(id: string): string {
  const warehouse = WAREHOUSES.find((candidate) => candidate.id === id);
  return warehouse ? `${warehouse.name} (${warehouse.id})` : id;
}
