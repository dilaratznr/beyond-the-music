import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';
import { resolveEditStatus, getLastRejection } from '@/lib/content-review';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const genre = await prisma.genre.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, nameTr: true, nameEn: true, slug: true } },
      children: true,
      _count: { select: { artists: true, articles: true } },
    },
  });
  if (!genre) return NextResponse.json({ error: 'Genre not found' }, { status: 404 });
  const lastRejection = await getLastRejection('GENRE', id);
  return NextResponse.json({ ...genre, lastRejection });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireSectionAccess('GENRE', 'canEdit');
  if (error || !user) return error;

  const { id } = await params;
  const body = await request.json();
  const { nameTr, nameEn, descriptionTr, descriptionEn, image, parentId, order } = body;

  const existing = await prisma.genre.findUnique({
    where: { id },
    select: { nameTr: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: 'Genre not found' }, { status: 404 });

  const { status: nextStatus, requiresReview } = await resolveEditStatus({
    section: 'GENRE',
    userId: user.id,
    entityId: id,
    entityTitle: nameTr ?? existing.nameTr,
    currentStatus: existing.status as 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED',
  });

  const data: Record<string, unknown> = { status: nextStatus };
  if (nameTr !== undefined) data.nameTr = nameTr;
  if (nameEn !== undefined) {
    data.nameEn = nameEn;
    data.slug = slugify(nameEn);
  }
  if (descriptionTr !== undefined) data.descriptionTr = descriptionTr || null;
  if (descriptionEn !== undefined) data.descriptionEn = descriptionEn || null;
  if (image !== undefined) data.image = image || null;
  if (parentId !== undefined) {
    // Prevent a genre from being its own parent
    if (parentId === id) {
      return NextResponse.json({ error: 'A genre cannot be its own parent' }, { status: 400 });
    }
    data.parentId = parentId || null;
  }
  if (order !== undefined) data.order = order;

  const genre = await prisma.genre.update({ where: { id }, data });
  revalidateTag(CACHE_TAGS.genre, 'max');
  return NextResponse.json({ ...genre, requiresReview });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('GENRE', 'canDelete');
  if (error) return error;

  const { id } = await params;
  const force = new URL(request.url).searchParams.get('force') === 'true';

  const genre = await prisma.genre.findUnique({
    where: { id },
    select: { id: true, nameTr: true },
  });
  if (!genre) {
    return NextResponse.json({ error: 'Genre not found' }, { status: 404 });
  }

  // Bağlantı sayıları — hem 409 mesajı için, hem force temizlik öncesi
  // kullanıcıya gösterilen "neyi etkileyecek" özeti için.
  const [childCount, articleCount, artistCount] = await Promise.all([
    prisma.genre.count({ where: { parentId: id } }),
    prisma.article.count({ where: { relatedGenreId: id } }),
    prisma.artistGenre.count({ where: { genreId: id } }),
  ]);

  const inUse = childCount + articleCount + artistCount > 0;

  // İlk tıklamada force=false → 409 + typed-confirm modal'ı açılır.
  // Kullanıcı tür adını yazıp "Yine de sil" derse force=true ile yeniden
  // çağrılır ve aşağıdaki transaction temizleyip siler.
  if (inUse && !force) {
    const parts: string[] = [];
    if (artistCount > 0) parts.push(`${artistCount} sanatçı`);
    if (articleCount > 0) parts.push(`${articleCount} makale`);
    if (childCount > 0) parts.push(`${childCount} alt tür`);

    return NextResponse.json(
      {
        error: 'Genre in use',
        requiresConfirmation: true,
        impact: {
          artists: artistCount,
          articles: articleCount,
          children: childCount,
        },
        message:
          `"${genre.nameTr}" türü ${parts.join(', ')} ile ilişkili. ` +
          `Silmeye devam edersen: sanatçılar bu etiketi kaybeder (kendileri silinmez), ` +
          `makalelerin tür bağlantısı temizlenir (makale kalır), alt türler bağımsız ` +
          `(parent'sız) kalır.`,
      },
      { status: 409 },
    );
  }

  // Force=true (veya zaten boş) → temizlik + silme tek transaction'da.
  // Sıra önemli: artist/article/children FK'larını çöz, sonra genre'ı sil.
  await prisma.$transaction([
    // 1) Sanatçı-tür bağlantılarını sil (sanatçılar kalır)
    prisma.artistGenre.deleteMany({ where: { genreId: id } }),
    // 2) Makalelerin tür tag'ini temizle (makaleler kalır)
    prisma.article.updateMany({
      where: { relatedGenreId: id },
      data: { relatedGenreId: null },
    }),
    // 3) Alt türleri parent'sız bırak (silmiyoruz — bağımsız tür olarak yaşar)
    prisma.genre.updateMany({
      where: { parentId: id },
      data: { parentId: null },
    }),
    // 4) Genre'ı sil
    prisma.genre.delete({ where: { id } }),
  ]);

  revalidateTag(CACHE_TAGS.genre, 'max');
  // Article relatedGenreId temizlendiği için makale cache'ini de yenile.
  if (articleCount > 0) revalidateTag(CACHE_TAGS.article, 'max');
  if (artistCount > 0) revalidateTag(CACHE_TAGS.artist, 'max');

  return NextResponse.json({ success: true });
}
