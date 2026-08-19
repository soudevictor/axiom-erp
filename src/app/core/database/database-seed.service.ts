import { Injectable } from '@angular/core';
import { faker } from '@faker-js/faker';
import { db } from '@/core/database/app-database';
import type {
  InventoryCategory,
  InventoryItem,
  InventoryStatus,
} from '@/core/models/inventory.model';
import type {
  TransactionCategory,
  TransactionStatus,
  TransactionType,
  TreasuryTransaction,
} from '@/core/models/treasury.model';

const SEED_INVENTORY_COUNT = 500;
const SEED_TRANSACTIONS_COUNT = 120;

const WAREHOUSE_IDS = [
  'WH-SP-001',
  'WH-RJ-002',
  'WH-MG-003',
  'WH-PR-004',
  'WH-RS-005',
] as const;

const PARTNERS = [
  { id: 'PART-001', name: 'TechSupply Brasil Distribuidora Ltda' },
  { id: 'PART-002', name: 'MegaLogística Soluções de Transporte S.A.' },
  { id: 'PART-003', name: 'Escritório Central de Eletrônicos Eireli' },
  { id: 'PART-004', name: 'Hardware & Cia Suprimentos Industriais' },
  { id: 'PART-005', name: 'Global Logistics & Freight Corp' },
] as const;

const PRODUCT_NAMES_BY_CATEGORY: Record<InventoryCategory, readonly string[]> = {
  ELECTRONICS: [
    'Cabo HDMI 2.1 Ultra',
    'Fonte ATX 750W Modular',
    'SSD NVMe 1TB Gen4',
    'Memória DDR5 16GB 5600MHz',
    'Placa de Rede 10GbE',
    'Hub USB-C 7 Portas',
    'Webcam 4K Ultra HD',
    'Mouse Óptico Wireless',
    'Teclado Mecânico RGB',
    'Monitor LED 27" 144Hz',
  ],
  HARDWARE: [
    'Parafuso Phillips M3x8',
    'Porca Sextavada M6',
    'Arruela de Pressão 1/4"',
    'Broca HSS 6mm',
    'Serra Circular 7-1/4"',
    'Chave Torx T25',
    'Alicate Universal 8"',
    'Trena Laser 50m',
  ],
  LOGISTICS: [
    'Caixa de Papelão 40x30x20',
    'Fita Adesiva Transparente 48mm',
    'Pallet PBR 1200x1000',
    'Stretch Film 500mm',
    'Etiqueta Térmica 100x50',
    'Cinta de Amarração 5T',
  ],
  OFFICE: [
    'Resma de Papel A4 75g',
    'Caneta Esferográfica Azul',
    'Grampeador de Mesa 26/6',
    'Clips Niquelado 2/0',
    'Pasta Catálogo A4',
    'Post-it 76x76mm Amarelo',
  ],
};

function deriveInventoryStatus(quantity: number, minThreshold: number): InventoryStatus {
  if (quantity === 0) return 'OUT_OF_STOCK';
  if (quantity <= minThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}

function generateInventoryItem(): InventoryItem {
  const category = faker.helpers.arrayElement<InventoryCategory>([
    'ELECTRONICS',
    'HARDWARE',
    'LOGISTICS',
    'OFFICE',
  ]);

  const productNames = PRODUCT_NAMES_BY_CATEGORY[category];
  const baseName = faker.helpers.arrayElement([...productNames]);
  const variant = faker.commerce.productAdjective();

  const minThreshold = faker.number.int({ min: 5, max: 50 });
  const quantity = faker.helpers.weightedArrayElement([
    { value: 0, weight: 5 },
    { value: faker.number.int({ min: 1, max: minThreshold }), weight: 20 },
    { value: faker.number.int({ min: minThreshold + 1, max: 2000 }), weight: 75 },
  ]);

  const priceRanges: Record<InventoryCategory, { min: number; max: number }> = {
    ELECTRONICS: { min: 29.9, max: 4500.0 },
    HARDWARE: { min: 1.5, max: 850.0 },
    LOGISTICS: { min: 0.8, max: 320.0 },
    OFFICE: { min: 2.0, max: 180.0 },
  };

  const price = priceRanges[category];

  return {
    id: faker.string.uuid(),
    sku: `${category.slice(0, 3)}-${faker.string.alphanumeric({ length: 4, casing: 'upper' })}-${faker.number.int({ min: 1000, max: 9999 })}`,
    name: `${baseName} ${variant}`,
    category,
    warehouseId: faker.helpers.arrayElement([...WAREHOUSE_IDS]),
    quantity,
    minThreshold,
    unitPrice: parseFloat(
      faker.commerce.price({ min: price.min, max: price.max })
    ),
    status: deriveInventoryStatus(quantity, minThreshold),
    updatedAt: faker.date.recent({ days: 90 }),
  };
}

function generateTreasuryTransaction(): TreasuryTransaction {
  const type = faker.helpers.arrayElement<TransactionType>(['INCOME', 'EXPENSE']);
  const status = faker.helpers.weightedArrayElement<TransactionStatus>([
    { value: 'COMPLETED', weight: 70 },
    { value: 'PENDING', weight: 25 },
    { value: 'CANCELLED', weight: 5 },
  ]);

  const category = type === 'INCOME'
    ? 'CLIENT_RECEIPT'
    : faker.helpers.arrayElement<TransactionCategory>(['SUPPLIER_PAYMENT', 'LOGISTICS', 'TAXES']);

  const partner = faker.helpers.arrayElement([...PARTNERS]);

  const dueDate = faker.date.between({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
  }).toISOString();

  const paymentDate = status === 'COMPLETED' ? dueDate : undefined;

  const descriptionsByType: Record<TransactionType, string[]> = {
    INCOME: [
      'Recebimento de Fatura de Venda B2B',
      'Venda de Lote de Eletrônicos',
      'Pagamento de Pedido de Compra Grandes Contas',
      'Adiantamento de Contrato de Suprimentos',
    ],
    EXPENSE: [
      'Pagamento de Fornecedor de Componentes',
      'Frete e Transporte de Lote Multimodal',
      'Recolhimento de Impostos de Importação ICMS/IPI',
      'Manutenção Preventiva de Armazém Central',
    ],
  };

  const baseDescription = faker.helpers.arrayElement(descriptionsByType[type]);

  return {
    id: faker.string.uuid(),
    description: `${baseDescription} #${faker.number.int({ min: 1000, max: 9999 })}`,
    type,
    amount: parseFloat(faker.commerce.price({ min: 500, max: 150000 })),
    category,
    partnerId: partner.id,
    partnerName: partner.name,
    status,
    dueDate,
    paymentDate,
  };
}

@Injectable({ providedIn: 'root' })
export class DatabaseSeedService {
  async initialize(): Promise<void> {
    const inventoryCount = await db.inventory.count();
    if (inventoryCount === 0) {
      await this.seedInventory();
    }

    const transactionsCount = await db.transactions.count();
    if (transactionsCount === 0) {
      await this.seedTransactions();
    }
  }

  async seedInventory(): Promise<void> {
    const items: InventoryItem[] = Array.from(
      { length: SEED_INVENTORY_COUNT },
      () => generateInventoryItem()
    );
    await db.inventory.bulkAdd(items);
  }

  async seedTransactions(): Promise<void> {
    const items: TreasuryTransaction[] = Array.from(
      { length: SEED_TRANSACTIONS_COUNT },
      () => generateTreasuryTransaction()
    );
    await db.transactions.bulkAdd(items);
  }

  async resetDatabase(): Promise<void> {
    await db.inventory.clear();
    await db.transactions.clear();
    await this.seedInventory();
    await this.seedTransactions();
  }

  // Alias for compatibility
  async reset(): Promise<void> {
    await this.resetDatabase();
  }
}
