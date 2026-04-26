import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';
import { resolveEditStatus, getLastRejection } from '@/lib/content-review';

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
  const lastRejection = await getLastRejection('ARTIST', id);
  return NextResponse.json({ ...artist, lastRejection });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireSectionAccess('ARTIST', 'canEdit');
  if (error || !user) return error;

  const { id } = await params;
  const body = await request.json();
  const { name, type, bioTr, bioEn, image, birthDate, deathDate, genreIds } = body;

  // Mevcut kaydın status'unu + adını al — onay kapısı kararı için.
  const existing = await prisma.artist.findUnique({
    where: { id },
    select: { name: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: 'Artist not found' }, { status: 404 });

  const { status: nextStatus, requiresReview } = await resolveEditStatus({
    section: 'ARTIST',
    userId: user.id,
    entityId: id,
    entityTitle: name ?? existing.name,
    currentStatus: existing.status as 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED',
  });

  const data: Record<string, unknown> = { status: nextStatus };
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
  return NextResponse.json({ ...artist, requiresReview });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('ARTIST', 'canDelete');
  if (error) return error;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  // İlişkili kayıt sayıları — cascade etkisi. Artist silinince Album'ler
  // cascade ile gider, onların Song'ları da. 50 albüm + 500 şarkı yanlışlıkla
  // kaybolmasın diye ilk çağrıda sayıları döndürüp kullanıcıdan açık onay
  // istiyoruz (?force=true).
  const [albumCount, songCount] = await Promise.all([
    prisma.album.count({ where: { artistId: id } }),
    prisma.song.count({ where: { album: { artistId: id } } }),
  ]);

  if (!force && albumCount + songCount > 0) {
    return NextResponse.json(
      {
        error: 'Artist in use',
        requiresConfirmation: true,
        impact: { albums: albumCount, songs: songCount },
        message: `Bu sanatçının ${albumCount} albümü ve ${songCount} şarkısı var. Sanatçı silindiğinde hepsi birlikte kaybolur.`,
      },
      { status: 409 },
    );
  }

  await prisma.artist.delete({ where: { id } });
  revalidateTag(CACHE_TAGS.artist, 'max');
  return NextResponse.json({ success: true });
}
