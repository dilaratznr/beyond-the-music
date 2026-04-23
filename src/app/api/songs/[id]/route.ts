import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const song = await prisma.song.findUnique({
    where: { id },
    include: {
      album: {
        select: {
          id: true,
          title: true,
          slug: true,
          artist: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });
  if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  return NextResponse.json(song);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('ALBUM', 'canEdit');
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { title, albumId, trackNumber, duration, isDeepCut, spotifyUrl, youtubeUrl } = body;

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (albumId !== undefined) data.albumId = albumId;
  if (trackNumber !== undefined) {
    data.trackNumber = trackNumber === null || trackNumber === '' ? null : Number(trackNumber);
  }
  if (duration !== undefined) data.duration = duration || null;
  if (isDeepCut !== undefined) data.isDeepCut = Boolean(isDeepCut);
  if (spotifyUrl !== undefined) data.spotifyUrl = spotifyUrl || null;
  if (youtubeUrl !== undefined) data.youtubeUrl = youtubeUrl || null;

  const song = await prisma.song.update({ where: { id }, data });
  revalidateTag(CACHE_TAGS.song, 'max');
  revalidateTag(CACHE_TAGS.album, 'max');
  return NextResponse.json(song);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('ALBUM', 'canDelete');
  if (error) return error;

  const { id } = await params;
  await prisma.song.delete({ where: { id } });
  revalidateTag(CACHE_TAGS.song, 'max');
  revalidateTag(CACHE_TAGS.album, 'max');
  return NextResponse.json({ success: true });
}
