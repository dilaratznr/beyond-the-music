import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';

/**
 * POST /api/songs/bulk-delete
 * Body: { ids: string[] }
 *
 * Songs share the ALBUM section's permissions (mirrors how the per-song
 * DELETE handler is gated), so an editor who can prune an album can
 * also bulk-prune its tracks.
 */
export async function POST(request: NextRequest) {
  const { error } = await requireSectionAccess('ALBUM', 'canDelete');
  if (error) return error;

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown): x is string => typeof x === 'string') : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids gerekli' }, { status: 400 });
  }

  const result = await prisma.song.deleteMany({ where: { id: { in: ids } } });
  revalidateTag(CACHE_TAGS.song, 'max');
  revalidateTag(CACHE_TAGS.album, 'max');
  return NextResponse.json({ success: true, deleted: result.count });
}
