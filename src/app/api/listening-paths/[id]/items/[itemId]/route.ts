import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';

/**
 * Per-item operations on a listening path — update notes, delete one entry.
 * The pathId in the URL is used purely as a scope guard so clients can't
 * mutate an item belonging to a different path.
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { error } = await requireSectionAccess('LISTENING_PATH', 'canEdit');
  if (error) return error;

  const { id, itemId } = await params;
  const body = await request.json();
  const { noteTr, noteEn } = body;

  const data: Record<string, unknown> = {};
  if (noteTr !== undefined) data.noteTr = noteTr || null;
  if (noteEn !== undefined) data.noteEn = noteEn || null;

  const result = await prisma.listeningPathItem.updateMany({
    where: { id: itemId, pathId: id },
    data,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  revalidateTag(CACHE_TAGS.listeningPath, 'max');
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { error } = await requireSectionAccess('LISTENING_PATH', 'canEdit');
  if (error) return error;

  const { id, itemId } = await params;
  const result = await prisma.listeningPathItem.deleteMany({
    where: { id: itemId, pathId: id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  revalidateTag(CACHE_TAGS.listeningPath, 'max');
  return NextResponse.json({ success: true });
}
