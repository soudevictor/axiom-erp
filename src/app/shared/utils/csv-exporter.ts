/**
 * Generic CSV exporter utility.
 * Converts an array of typed objects into a UTF-8 BOM CSV and triggers an automatic download.
 *
 * @param data     Array of records to export.
 * @param filename Desired filename (without extension).
 * @param headers  Map from object key to human-readable column header.
 */
export function exportToCsv<T extends Record<string, unknown>>(
  data: readonly T[],
  filename: string,
  headers: Partial<Record<keyof T, string>>
): void {
  const columnKeys = Object.keys(headers) as (keyof T)[];
  const headerRow = columnKeys.map((k) => escapeCell(headers[k] ?? String(k)));

  const rows = data.map((record) =>
    columnKeys.map((key) => escapeCell(formatCellValue(record[key])))
  );

  const csvLines = [headerRow, ...rows].map((row) => row.join(';'));
  // UTF-8 BOM ensures correct rendering in Excel pt-BR
  const bom = '\uFEFF';
  const csvContent = bom + csvLines.join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Release object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Escapes a cell value for CSV: wraps in quotes if it contains delimiter, quote or newline. */
function escapeCell(value: string): string {
  if (/[;\n\r"]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Converts an arbitrary cell value to string, handling Dates and numbers correctly. */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    return value.toLocaleDateString('pt-BR');
  }
  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(value);
}
