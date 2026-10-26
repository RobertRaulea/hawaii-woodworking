const cellText = (value: string | number | null): string => {
  if (value === null) return '';
  if (typeof value === 'number') return String(value);
  // Guard against formula injection when opened in spreadsheets.
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
};

export const toCsv = (rows: (string | number | null)[][]): string =>
  rows
    .map((row) =>
      row
        .map((cell) => `"${cellText(cell).replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\r\n') + '\r\n';

export const downloadCsv = (filename: string, csv: string): void => {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  // BOM is intentionally first in the blob for Excel's UTF-8 detection.
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
