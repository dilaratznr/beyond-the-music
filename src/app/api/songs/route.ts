import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';

/**
 * Songs are subordinate to Albums — they inherit the ALBUM permission
 * section so we don't need a separate permission grid for them.
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const albumId = searchParams.get('albumId');
  const isDeepCut = searchParams.get('isDeepCut');
  const all = searchParams.get('all') === 'true';

  const where: Record<string, unknown> = {};
  if (albumId) where.albumId = albumId;
  if (isDeepCut === 'true') where.isDeepCut = true;

  if (all) {
    const songs = await prisma.song.findMany({
      where,
      include: { album: { select: { id: true, title: true, slug: true, coverImage: true, artist: { select: { name: true } } } } },
      orderBy: [{ albumId: 'asc' }, { trackNumber: 'asc' }],
    });
    return NextResponse.json(songs);
  }

  const [items, total] = await Promise.all([
    prisma.song.findMany({
      where,
      include: { album: { select: { id: true, title: true, slug: true, coverImage: true, artist: { select: { name: true } } } } },
      orderBy: [{ albumId: 'asc' }, { trackNumber: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.song.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error } = await requireSectionAccess('ALBUM', 'canCreate');
  if (error) return error;

  const body = await request.json();
  const { title, albumId, trackNumber, duration, isDeepCut, spotifyUrl, youtubeUrl } = body;

  if (!title || !albumId) {
    return NextResponse.json({ error: 'Title and album are required' }, { status: 400 });
  }

  // Verify album exists so we fail fast with a 400 instead of a Prisma FK error
  const album = await prisma.album.findUnique({ where: { id: albumId }, select: { id: true } });
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 400 });

  const song = await prisma.song.create({
    data: {
      title,
      albumId,
      trackNumber: trackNumber != null && trackNumber !== '' ? Number(trackNumber) : null,
      duration: duration || null,
      isDeepCut: Boolean(isDeepCut),
      spotifyUrl: spotifyUrl || null,
      youtubeUrl: youtubeUrl || null,
    },
  });

  return NextResponse.json(song, { status: 201 });
}
