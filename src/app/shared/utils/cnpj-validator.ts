/**
 * Pure CNPJ validator using the official Brazilian Módulo 11 check-digit algorithm.
 * Reference: Receita Federal do Brasil specification.
 */

/** Strips all non-digit characters from a CNPJ string. */
export function stripCnpj(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Validates a CNPJ string (with or without mask).
 * Returns `true` if valid, `false` otherwise.
 */
export function isValidCnpj(rawValue: string): boolean {
  const digits = stripCnpj(rawValue);

  if (digits.length !== 14) return false;

  // Reject sequences of identical digits (e.g. "00000000000000")
  if (/^(\d)\1+$/.test(digits)) return false;

  return (
    checkDigit(digits, 12) === Number(digits[12]) &&
    checkDigit(digits, 13) === Number(digits[13])
  );
}

/**
 * Calculates the expected check digit at `position` (12 or 13).
 * Uses Módulo 11 with weights cycling from 2 to 9.
 */
function checkDigit(digits: string, position: number): number {
  let sum = 0;
  let weight = 2;

  for (let i = position - 1; i >= 0; i--) {
    sum += Number(digits[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }

  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/**
 * Formats a 14-digit string into the Brazilian CNPJ mask: `00.000.000/0000-00`.
 * Returns the original value unchanged if it cannot be formatted.
 */
export function formatCnpj(value: string): string {
  const digits = stripCnpj(value);
  if (digits.length !== 14) return value;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}
