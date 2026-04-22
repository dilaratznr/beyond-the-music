/**
 * Pure datetime-local <input> helpers — no side effects, no server APIs.
 *
 * Split out from `article-publishing.ts` so admin client components
 * (the new/edit article forms) can import them without dragging the
 * server-only `revalidateTag` call into the client bundle.
 */

/**
 * Parse a datetime-local input value ("2026-04-20T15:30") into a Date that
 * represents that wall-clock time in the browser's local timezone.
 * Returns null for empty / invalid inputs.
 */
export function parseScheduledFor(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Format a Date as a `datetime-local` input value (YYYY-MM-DDTHH:MM).
 * Returns '' for null/undefined.
 */
export function toDatetimeLocalValue(
  date: Date | string | null | undefined,
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}
