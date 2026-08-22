/**
 * Currency formatting helpers for Brazilian Real (BRL).
 * All functions are pure — no side effects.
 */

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a numeric value as Brazilian currency string.
 * @example formatBrl(1234.5) → "R$ 1.234,50"
 */
export function formatBrl(value: number): string {
  return BRL_FORMATTER.format(value);
}

/**
 * Parses a formatted BRL string back to a float.
 * Accepts strings like "R$ 1.234,50", "1.234,50" or "1234.50".
 * Returns `NaN` if the input cannot be parsed.
 *
 * @example parseBrl("R$ 1.234,50") → 1234.5
 */
export function parseBrl(value: string): number {
  // Remove currency symbol and non-numeric chars except comma and dot
  const cleaned = value.replace(/[R$\s]/g, '').trim();

  // pt-BR format: thousands = ".", decimal = ","
  // Convert to standard float notation
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? NaN : parsed;
}

/**
 * Applies a real-time BRL mask to a raw input string during user typing.
 * Takes a raw numeric string (digits only) and returns "R$ X.XXX,XX".
 * Suitable for use in input event handlers.
 *
 * @example applyBrlMask("123456") → "R$ 1.234,56"
 */
export function applyBrlMask(rawInput: string): string {
  const digits = rawInput.replace(/\D/g, '');
  if (!digits || digits === '0') return 'R$ 0,00';

  // Value in cents
  const cents = parseInt(digits, 10);
  const float = cents / 100;

  return BRL_FORMATTER.format(float);
}
