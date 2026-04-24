import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      artist: { select: { id: true, name: true, slug: true } },
      songs: { orderBy: { trackNumber: 'asc' } },
    },
  });
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  return NextResponse.json(album);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('ALBUM', 'canEdit');
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { title, artistId, releaseDate, coverImage, descriptionTr, descriptionEn } = body;

  const data: Record<string, unknown> = {};
  if (title !== undefined) {
    data.title = title;
    data.slug = slugify(title);
  }
  if (artistId !== undefined) data.artistId = artistId;
  if (releaseDate !== undefined) data.releaseDate = releaseDate ? new Date(releaseDate) : null;
  if (coverImage !== undefined) data.coverImage = coverImage || null;
  if (descriptionTr !== undefined) data.descriptionTr = descriptionTr || null;
  if (descriptionEn !== undefined) data.descriptionEn = descriptionEn || null;

  const album = await prisma.album.update({ where: { id }, data });
  revalidateTag(CACHE_TAGS.album, 'max');
  revalidateTag(CACHE_TAGS.song, 'max');
  return NextResponse.json(album);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('ALBUM', 'canDelete');
  if (error) return error;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  // Album cascade edildiğinde Song'lar da gider — ?force=true'suz ilk
  // çağrıda şarkı sayısını bildir ki kullanıcı neyi sileceğini görsün.
  const songCount = await prisma.song.count({ where: { albumId: id } });

  if (!force && songCount > 0) {
    return NextResponse.json(
      {
        error: 'Album has songs',
        requiresConfirmation: true,
        impact: { songs: songCount },
        message: `Bu albümde ${songCount} şarkı var. Albüm silindiğinde şarkıları da kaybolur.`,
      },
      { status: 409 },
    );
  }

  await prisma.album.delete({ where: { id } });
  revalidateTag(CACHE_TAGS.album, 'max');
  revalidateTag(CACHE_TAGS.song, 'max');
  return NextResponse.json({ success: true });
}
