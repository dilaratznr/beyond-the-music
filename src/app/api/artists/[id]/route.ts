import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artist = await prisma.artist.findUnique({
    where: { id },
    include: {
      genres: { include: { genre: true } },
      albums: { orderBy: { releaseDate: 'desc' } },
      _count: { select: { albums: true, articles: true } },
    },
  });
  if (!artist) return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
  return NextResponse.json(artist);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('ARTIST', 'canEdit');
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { name, type, bioTr, bioEn, image, birthDate, deathDate, genreIds } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) {
    data.name = name;
    data.slug = slugify(name);
  }
  if (type !== undefined) data.type = type;
  if (bioTr !== undefined) data.bioTr = bioTr || null;
  if (bioEn !== undefined) data.bioEn = bioEn || null;
  if (image !== undefined) data.image = image || null;
  if (birthDate !== undefined) data.birthDate = birthDate ? new Date(birthDate) : null;
  if (deathDate !== undefined) data.deathDate = deathDate ? new Date(deathDate) : null;

  const artist = await prisma.artist.update({ where: { id }, data });

  if (Array.isArray(genreIds)) {
    await prisma.artistGenre.deleteMany({ where: { artistId: id } });
    if (genreIds.length > 0) {
      await prisma.artistGenre.createMany({
        data: genreIds.map((genreId: string) => ({ artistId: id, genreId })),
        skipDuplicates: true,
      });
    }
  }

  revalidateTag(CACHE_TAGS.artist, 'max');
  return NextResponse.json(artist);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('ARTIST', 'canDelete');
  if (error) return error;

  const { id } = await params;
  await prisma.artist.delete({ where: { id } });
  revalidateTag(CACHE_TAGS.artist, 'max');
  return NextResponse.json({ success: true });
}
