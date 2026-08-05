import { Injectable } from '@angular/core';
import { faker } from '@faker-js/faker';
import { db } from '@/core/database/app-database';
import type {
  InventoryCategory,
  InventoryItem,
  InventoryStatus,
} from '@/core/models/inventory.model';

const SEED_COUNT = 500;

const WAREHOUSE_IDS = [
  'WH-SP-001',
  'WH-RJ-002',
  'WH-MG-003',
  'WH-PR-004',
  'WH-RS-005',
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
    'Headset Bluetooth ANC',
    'Carregador GaN 100W',
    'Switch Ethernet 8 Portas',
    'Roteador Wi-Fi 6E',
    'Adaptador DisplayPort',
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
    'Nível a Laser 360°',
    'Furadeira de Impacto 800W',
    'Parafusadeira 12V Li-Ion',
    'Disco de Corte 7"',
    'Lixa Orbital 150mm',
    'Brocas SDS-Plus Kit',
    'Grampeador Industrial',
  ],
  LOGISTICS: [
    'Caixa de Papelão 40x30x20',
    'Fita Adesiva Transparente 48mm',
    'Pallet PBR 1200x1000',
    'Stretch Film 500mm',
    'Etiqueta Térmica 100x50',
    'Cinta de Amarração 5T',
    'Saco Plástico PEBD 30x40',
    'Plástico Bolha 1.2m',
    'Fita de Arquear PP 12mm',
    'Cantoneira de Papelão',
    'Envelope de Segurança A4',
    'Tag RFID Logística',
    'Lacre de Segurança',
    'Container Dobrável 600L',
    'Divisória para Caixa',
  ],
  OFFICE: [
    'Resma de Papel A4 75g',
    'Caneta Esferográfica Azul',
    'Grampeador de Mesa 26/6',
    'Clips Niquelado 2/0',
    'Pasta Catálogo A4',
    'Post-it 76x76mm Amarelo',
    'Envelope Kraft A4',
    'Régua Acrílica 30cm',
    'Tesoura Multiuso 21cm',
    'Corretivo Líquido 18ml',
    'Bloco de Anotações A5',
    'Marcador Permanente',
    'Porta-Canetas Acrílico',
    'Organizador de Mesa',
    'Caderno Espiral 200fl',
  ],
};

function deriveStatus(quantity: number, minThreshold: number): InventoryStatus {
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

  const unitPriceRanges: Record<InventoryCategory, { min: number; max: number }> = {
    ELECTRONICS: { min: 29.9, max: 4500.0 },
    HARDWARE: { min: 1.5, max: 850.0 },
    LOGISTICS: { min: 0.8, max: 320.0 },
    OFFICE: { min: 2.0, max: 180.0 },
  };

  const priceRange = unitPriceRanges[category];

  return {
    id: faker.string.uuid(),
    sku: `${category.slice(0, 3)}-${faker.string.alphanumeric({ length: 4, casing: 'upper' })}-${faker.number.int({ min: 1000, max: 9999 })}`,
    name: `${baseName} ${variant}`,
    category,
    warehouseId: faker.helpers.arrayElement([...WAREHOUSE_IDS]),
    quantity,
    minThreshold,
    unitPrice: parseFloat(
      faker.commerce.price({ min: priceRange.min, max: priceRange.max })
    ),
    status: deriveStatus(quantity, minThreshold),
    updatedAt: faker.date.recent({ days: 90 }),
  };
}

@Injectable({ providedIn: 'root' })
export class DatabaseSeedService {
  async initialize(): Promise<void> {
    const count = await db.inventory.count();
    if (count === 0) {
      await this.seed();
    }
  }

  async seed(): Promise<void> {
    const items: InventoryItem[] = Array.from(
      { length: SEED_COUNT },
      () => generateInventoryItem()
    );
    await db.inventory.bulkAdd(items);
  }

  async reset(): Promise<void> {
    await db.inventory.clear();
    await this.seed();
  }
}
