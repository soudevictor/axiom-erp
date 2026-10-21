import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InventoryItem } from '@/core/models/inventory.model';
import { exportInventoryCsv } from './inventory-csv';
import { exportToCsv } from './csv-exporter';

function createItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'INV-0001',
    sku: 'ELE-ABCD-0001',
    name: 'Produto de Teste',
    category: 'ELECTRONICS',
    warehouseId: 'WH-SP-001',
    quantity: 10,
    minThreshold: 2,
    unitPrice: 49.9,
    status: 'IN_STOCK',
    updatedAt: new Date('2026-10-21T12:30:00.000Z'),
    ...overrides,
  };
}

async function blobToText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

describe('exportInventoryCsv', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exporta cabeçalho pt-BR, BOM e valores formatados com ponto e vírgula', async () => {
    let blob: Blob | null = null;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
      blob = value as Blob;
      return 'blob:test';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    exportInventoryCsv([
      createItem({
        name: 'Produto; com separador',
        quantity: 1234,
        unitPrice: 1234.5,
      }),
    ]);

    expect(blob).not.toBeNull();
    const content = await blobToText(blob!);

    // Check for UTF-8 BOM (0xEF 0xBB 0xBF) in raw bytes
    const bytes = await blobToBytes(blob!);
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    expect(content).toContain('SKU;Produto;Categoria;Armazém;UF;Quantidade');
    expect(content).toContain('ELE-ABCD-0001;"Produto; com separador";Eletrônicos;São Paulo;SP;1.234;2;1.234,50;1.523.373,00;Em estoque');
  });

  it('exporta somente o cabeçalho quando não há itens', async () => {
    let blob: Blob | null = null;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
      blob = value as Blob;
      return 'blob:test';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    exportInventoryCsv([]);

    const content = await blobToText(blob!);
    expect(content.split('\r\n')).toHaveLength(1);
    expect(content).toContain('Atualizado em');
  });

  it('exportToCsv gera BOM e separador ponto e vírgula', async () => {
    let blob: Blob | null = null;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
      blob = value as Blob;
      return 'blob:test';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    exportToCsv([{ a: 1, b: 'test;value' }], 'test', { a: 'A', b: 'B' });

    expect(blob).not.toBeNull();
    const bytes = await blobToBytes(blob!);
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    const content = await blobToText(blob!);
    expect(content).toContain('A;B');
    // Number formatting in pt-BR uses comma as decimal separator
    expect(content).toContain('1,00;"test;value"');
  });
});
