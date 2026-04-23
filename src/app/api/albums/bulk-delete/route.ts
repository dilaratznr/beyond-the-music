import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';

/**
 * POST /api/albums/bulk-delete
 * Body: { ids: string[] }
 *
 * Cascades through the schema's relations: the `songs` FK is set to
 * `onDelete: Cascade`, so removing an album also drops its track list
 * in the same transaction. Returns the actual deleted count so the UI
 * can show "5 albüm silindi" even if a few IDs were stale.
 */
export async function POST(request: NextRequest) {
  const { error } = await requireSectionAccess('ALBUM', 'canDelete');
  if (error) return error;

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown): x is string => typeof x === 'string') : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids gerekli' }, { status: 400 });
  }

  const result = await prisma.album.deleteMany({ where: { id: { in: ids } } });
  revalidateTag(CACHE_TAGS.album, 'max');
  revalidateTag(CACHE_TAGS.song, 'max');
  return NextResponse.json({ success: true, deleted: result.count });
}
