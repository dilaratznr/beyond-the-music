/**
 * Minimal RFC-4180-like CSV parse: handles quotes, embedded commas,
 * escaped quotes, BOM strip. Not full RFC (no binary/UTF-16/multiline);
 * sufficient for admin import (small discographies).
 */

export function parseCsv(text: string): string[][] {
  // Strip UTF-8 BOM that Excel loves to prepend.
  const src = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        // Escaped quote ("") in quoted field.
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      // Consume \r\n as one line break.
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // Flush the trailing field/row if the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop completely empty trailing rows (common in hand-edited CSVs).
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c.trim() === '')) {
    rows.pop();
  }

  return rows;
}

/**
 * Turn a list of rows (header + data) into a CSV string. Each cell is
 * wrapped in quotes only if it contains a comma, quote, or newline —
 * keeps the output readable when the payload is boring.
 */
export function buildCsv(rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return rows.map((r) => r.map(escape).join(',')).join('\r\n') + '\r\n';
}

/**
 * Pick rows off a parsed CSV as objects keyed by the header row. Trims
 * whitespace around header names so that "Album Title" and
 * "album_title" don't need to match exactly — callers pass in the
 * header names they want, normalized ahead of time.
 */
export function rowsToRecords(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const [headerRow, ...data] = rows;
  const headers = headerRow.map((h) => h.trim());
  return data
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => {
      const rec: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rec[h] = (r[idx] ?? '').trim();
      });
      return rec;
    });
}

/** Truthy strings permitted in boolean cells. */
const TRUE_SET = new Set(['1', 'true', 'yes', 'evet', 'doğru', 'dogru', 'x', '✓']);

export function parseBool(v: string | undefined | null): boolean {
  if (!v) return false;
  return TRUE_SET.has(v.trim().toLowerCase());
}

/** Parse a year cell. Accepts "2005", "2005-03-14", or empty. */
export function parseReleaseDate(v: string | undefined | null): Date | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  if (/^\d{4}$/.test(s)) {
    return new Date(`${s}-01-01T00:00:00.000Z`);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parse a track number, treating "" / invalid as null. */
export function parseTrackNumber(v: string | undefined | null): number | null {
  if (!v) return null;
  const n = Number(v.trim());
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}
