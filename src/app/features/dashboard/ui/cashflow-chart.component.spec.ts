import { describe, expect, it } from 'vitest';
import type { MonthlyCashflow } from '@/core/models/treasury.model';

const MONTHLY: readonly MonthlyCashflow[] = [
  { month: '2026-05', income: 100000, expense: 60000, balance: 40000 },
  { month: '2026-06', income: 80000, expense: 90000, balance: -10000 },
  { month: '2026-07', income: 120000, expense: 70000, balance: 50000 },
  { month: '2026-08', income: 150000, expense: 80000, balance: 70000 },
  { month: '2026-09', income: 110000, expense: 95000, balance: 15000 },
  { month: '2026-10', income: 0, expense: 0, balance: 0 },
];

// Pure functions extracted from CashflowChartComponent for testing
function parseMonth(month: string): Date {
  const [year, monthStr] = month.split('-');
  return new Date(parseInt(year, 10), parseInt(monthStr, 10) - 1, 1);
}

function shortMonth(month: string): string {
  const date = parseMonth(month);
  const name = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(date)
    .replace('.', '');
  return `${name}/${String(date.getFullYear()).slice(-2)}`;
}

function fullMonth(month: string): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    parseMonth(month)
  );
}

function hasData(monthly: readonly MonthlyCashflow[]): boolean {
  return monthly.some((month) => month.income > 0 || month.expense > 0);
}

describe('CashflowChartComponent - pure functions', () => {
  it('deve formatar mês curto como mai/26', () => {
    expect(shortMonth('2026-05')).toBe('mai/26');
    expect(shortMonth('2026-10')).toBe('out/26');
    expect(shortMonth('2025-12')).toBe('dez/25');
  });

  it('deve formatar mês completo como maio de 2026', () => {
    expect(fullMonth('2026-05')).toBe('maio de 2026');
    expect(fullMonth('2026-10')).toBe('outubro de 2026');
  });

  it('deve detectar hasData quando há valores não-zero', () => {
    expect(hasData(MONTHLY)).toBe(true);
  });

  it('deve detectar hasData false quando todos zerados', () => {
    expect(hasData(MONTHLY.map(m => ({ ...m, income: 0, expense: 0, balance: 0 })))).toBe(false);
    expect(hasData([])).toBe(false);
  });
});