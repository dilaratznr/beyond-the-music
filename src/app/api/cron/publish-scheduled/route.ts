import { NextRequest, NextResponse } from 'next/server';
import { publishDueArticles } from '@/lib/article-publishing';

/**
 * Cron: SCHEDULED makaleleri tarihi gelince PUBLISHED'a çevirir.
 * Vercel cron schedule: vercel.json içinde her saat başı çağrılır.
 *
 * Auth: CRON_SECRET bearer token (Vercel cron otomatik gönderir).
 * fail-closed: env yoksa 401, timing-safe compare.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const count = await publishDueArticles();
  return NextResponse.json({
    ok: true,
    publishedCount: count,
    at: new Date().toISOString(),
  });
}
