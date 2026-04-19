import prisma from '@/lib/prisma';

/**
 * Scheduled articles live in a pending state: `status = SCHEDULED` with a
 * future `publishedAt`. When the clock catches up, we flip them to PUBLISHED
 * so the public site renders them without any cron infrastructure.
 *
 * This is a single UPDATE with a cheap WHERE — safe to call on every request
 * that surfaces articles to the public. Callers should `await` it before the
 * findMany/findUnique that might include the newly-due row.
 */
export async function publishDueArticles(): Promise<number> {
  try {
    const res = await prisma.article.updateMany({
      where: {
        status: 'SCHEDULED',
        publishedAt: { lte: new Date() },
      },
      data: { status: 'PUBLISHED' },
    });
    return res.count;
  } catch {
    // Never let the tick break the page render — worst case: a scheduled
    // article shows up a request later, when the next caller tries again.
    return 0;
  }
}

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
export function toDatetimeLocalValue(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}
