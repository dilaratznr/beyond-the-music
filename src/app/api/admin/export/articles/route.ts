import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { buildCsv } from '@/lib/csv';

/**
 * GET /api/admin/export/articles[?status=PUBLISHED|SCHEDULED|DRAFT]
 *
 * Mirrors the article list filters. Content columns are excluded
 * because they're long-form markdown and would bloat the CSV; this
 * export is for tracking / roster purposes (who wrote what, when,
 * what status), not for content round-tripping.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAuth('EDITOR');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const valid = new Set(['PUBLISHED', 'SCHEDULED', 'DRAFT']);
  const where = status && valid.has(status)
    ? { status: status as 'PUBLISHED' | 'SCHEDULED' | 'DRAFT' }
    : {};

  const articles = await prisma.article.findMany({
    where,
    include: { author: { select: { name: true } } },
    orderBy: [{ createdAt: 'desc' }],
  });

  const header = [
    'slug',
    'title_tr',
    'title_en',
    'category',
    'status',
    'author',
    'published_at',
    'created_at',
  ];

  const rows: (string | number | null)[][] = [header];
  for (const a of articles) {
    rows.push([
      a.slug,
      a.titleTr,
      a.titleEn,
      a.category,
      a.status,
      a.author?.name ?? '',
      a.publishedAt ? a.publishedAt.toISOString() : null,
      a.createdAt.toISOString(),
    ]);
  }

  const csv = buildCsv(rows);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="makaleler.csv"',
    },
  });
}
