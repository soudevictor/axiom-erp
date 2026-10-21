import { describe, expect, it } from 'vitest';
import { buildSeedBundle } from './seed';
import { inventorySeedTotals } from './seed-inventory';
import { STOCK_MOVEMENT_REASONS } from '@/core/models/stock-movement.model';

const NOW = new Date('2026-10-21T12:00:00.000Z');

describe('seed determinístico', () => {
  const bundle = buildSeedBundle(NOW);

  it('gera o volume planejado de registros', () => {
    expect(bundle.inventory).toHaveLength(500);
    expect(bundle.partners).toHaveLength(12);
    expect(bundle.transactions).toHaveLength(120);
    expect(bundle.stockMovements.length).toBeGreaterThan(200);
    expect(bundle.stockMovements.length).toBeLessThan(400);
  });

  it('é determinístico para a mesma data', () => {
    const again = buildSeedBundle(NOW);

    expect(again.inventory[0]).toEqual(bundle.inventory[0]);
    expect(again.inventory[499]).toEqual(bundle.inventory[499]);
    expect(again.transactions[0]).toEqual(bundle.transactions[0]);
    expect(again.stockMovements[0]).toEqual(bundle.stockMovements[0]);
  });

  it('mantém o ledger coerente com o saldo final de cada item', () => {
    const latest = new Map<string, (typeof bundle.stockMovements)[number]>();

    for (const movement of bundle.stockMovements) {
      expect(movement.previousQuantity).toBeGreaterThanOrEqual(0);
      expect(movement.newQuantity).toBeGreaterThanOrEqual(0);
      expect(STOCK_MOVEMENT_REASONS[movement.type]).toContain(movement.reason);

      const current = latest.get(movement.itemId);
      if (!current || current.createdAt < movement.createdAt) {
        latest.set(movement.itemId, movement);
      }
    }

    for (const item of bundle.inventory) {
      const movement = latest.get(item.id);
      if (movement) {
        expect(movement.newQuantity).toBe(item.quantity);
        expect(movement.sku).toBe(item.sku);
      }
    }
  });

  it('produz totais plausíveis para a demonstração', () => {
    const totals = inventorySeedTotals(bundle.inventory);

    expect(totals.units).toBeGreaterThanOrEqual(150_000);
    expect(totals.units).toBeLessThanOrEqual(300_000);
    expect(totals.value).toBeGreaterThanOrEqual(18_000_000);
    expect(totals.value).toBeLessThanOrEqual(35_000_000);
    expect(totals.low / bundle.inventory.length).toBeGreaterThan(0.05);
    expect(totals.low / bundle.inventory.length).toBeLessThan(0.12);
    expect(totals.out).toBeGreaterThan(0);
    expect(totals.out / bundle.inventory.length).toBeLessThan(0.04);
  });

  it('distribui parceiros entre os três estados e mantém crédito dentro do limite', () => {
    const statuses = new Set(bundle.partners.map((partner) => partner.status));

    expect(statuses).toEqual(new Set(['HOMOLOGADO', 'EM_ANALISE', 'BLOQUEADO']));
    for (const partner of bundle.partners) {
      expect(partner.creditUsed).toBeLessThanOrEqual(partner.creditLimit);
    }
    const blocked = bundle.partners.filter((partner) => partner.status === 'BLOQUEADO');
    expect(blocked.length).toBeGreaterThan(0);
    blocked.forEach((partner) => expect(partner.statusReason?.length ?? 0).toBeGreaterThan(10));
  });
});
