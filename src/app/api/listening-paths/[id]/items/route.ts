import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';

/**
 * Listening path items — the songs / albums / artists that make up a path.
 *
 * POST creates one new item and assigns it the next-highest order.
 * PATCH rewrites the order of existing items in bulk.
 */

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('LISTENING_PATH', 'canEdit');
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { songId, albumId, artistId, noteTr, noteEn } = body;

  // Exactly one of songId / albumId / artistId must be provided
  const targets = [songId, albumId, artistId].filter(Boolean);
  if (targets.length !== 1) {
    return NextResponse.json(
      { error: 'Tam olarak bir adet şarkı, albüm veya sanatçı seçmelisiniz.' },
      { status: 400 },
    );
  }

  // Confirm the path exists so we return a friendlier error than a Prisma FK
  const path = await prisma.listeningPath.findUnique({ where: { id }, select: { id: true } });
  if (!path) return NextResponse.json({ error: 'Listening path not found' }, { status: 404 });

  const last = await prisma.listeningPathItem.findFirst({
    where: { pathId: id },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  const nextOrder = (last?.order ?? -1) + 1;

  const item = await prisma.listeningPathItem.create({
    data: {
      pathId: id,
      songId: songId || null,
      albumId: albumId || null,
      artistId: artistId || null,
      noteTr: noteTr || null,
      noteEn: noteEn || null,
      order: nextOrder,
    },
    include: {
      song: { select: { id: true, title: true, album: { select: { title: true } } } },
      album: { select: { id: true, title: true } },
      artist: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('LISTENING_PATH', 'canEdit');
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const orderedIds: unknown = body.orderedIds;

  if (!Array.isArray(orderedIds) || orderedIds.some((v) => typeof v !== 'string')) {
    return NextResponse.json({ error: 'orderedIds must be string[]' }, { status: 400 });
  }

  // Rewrite `order` in a single transaction so we don't end up in a partial state.
  await prisma.$transaction(
    (orderedIds as string[]).map((itemId, idx) =>
      prisma.listeningPathItem.updateMany({
        where: { id: itemId, pathId: id },
        data: { order: idx },
      }),
    ),
  );

  return NextResponse.json({ success: true });
}
