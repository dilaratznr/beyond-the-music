import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess, isAdminRequest } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';
import { resolveCreateStatus, maybeCreateReviewOnCreate } from '@/lib/content-review';
import { publicApiRateLimit } from '@/lib/rate-limit';
import { audit, extractContext } from '@/lib/audit-log';

export async function GET(request: NextRequest) {
  const limited = await publicApiRateLimit(request, 'genres');
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20')), 100);
  const all = searchParams.get('all') === 'true';

  // Anonymous → PUBLISHED only; admin → all (admin/genres list page uses
  // ?all=true and needs to see drafts).
  const isAdmin = await isAdminRequest();
  const statusWhere = isAdmin ? {} : { status: 'PUBLISHED' as const };

  if (all) {
    const genres = await prisma.genre.findMany({
      where: statusWhere,
      include: { children: true, _count: { select: { artists: true, articles: true } } },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(genres);
  }

  const [items, total] = await Promise.all([
    prisma.genre.findMany({
      where: statusWhere,
      include: { children: true, _count: { select: { artists: true, articles: true } } },
      orderBy: { order: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.genre.count({ where: statusWhere }),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSectionAccess('GENRE', 'canCreate');
  if (error || !user) return error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON gövdesi' }, { status: 400 });
  }
  const { nameTr, nameEn, descriptionTr, descriptionEn, image, parentId, order } = body as {
    nameTr?: string; nameEn?: string;
    descriptionTr?: string; descriptionEn?: string;
    image?: string | null; parentId?: string | null; order?: number;
  };

  if (!nameTr || !nameEn) {
    return NextResponse.json({ error: 'TR ve EN isim zorunlu' }, { status: 400 });
  }

  const { status, requiresReview } = await resolveCreateStatus({
    section: 'GENRE',
    userId: user.id,
  });

  // Çakışmaya karşı baseSlug + suffix akışı: slugify(nameEn) zaten DB'de
  // varsa "-2", "-3" ekleyerek ilk boş slot'u bul. Editör aynı türü
  // sehven iki kez kaydetmeye çalıştığında 500 dönmek yerine ikinci
  // kaydı farklı slug'la kabul ediyoruz (review onayı yine bekliyor).
  const baseSlug = slugify(nameEn);
  if (!baseSlug) {
    return NextResponse.json({ error: 'EN isim geçerli bir slug üretmiyor' }, { status: 400 });
  }
  let slug = baseSlug;
  for (let i = 2; i < 100; i++) {
    const exists = await prisma.genre.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!exists) break;
    slug = `${baseSlug}-${i}`;
  }

  // Tüm Prisma yazımlarını try/catch'e al. Daha önce P2002 (unique constraint)
  // gibi hatalar Next'in default error handler'ına düşüyordu → HTML 500
  // dönüyordu → client `await res.json()` parse hatası alıyor → loading
  // state ("Oluşturuluyor…") sonsuza kadar takılıyordu.
  try {
    const genre = await prisma.genre.create({
      data: {
        slug, nameTr, nameEn,
        descriptionTr: descriptionTr || null,
        descriptionEn: descriptionEn || null,
        image: image || null,
        parentId: parentId || null,
        order: order || 0,
        status,
      },
    });

    await maybeCreateReviewOnCreate({
      section: 'GENRE',
      entityId: genre.id,
      entityTitle: genre.nameTr,
      userId: user.id,
      status,
    });

    const ctx = extractContext(request);
    await audit({
      event: 'GENRE_CREATED',
      actorId: user.id,
      targetId: genre.id,
      targetType: 'GENRE',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      detail: genre.nameTr,
    });

    revalidateTag(CACHE_TAGS.genre, 'max');
    return NextResponse.json({ ...genre, requiresReview }, { status: 201 });
  } catch (err) {
    console.error('[genres/POST] failed to create:', err);
    // Prisma unique constraint — yukarıdaki suffix loop'u 100'ü aştı veya
    // başka unique alan (örn. parentId+slug kombo) tetiklendi.
    const errObj = err as { code?: string; meta?: { target?: string[] } };
    if (errObj?.code === 'P2002') {
      const target = errObj.meta?.target?.join(', ') || 'alan';
      return NextResponse.json(
        { error: `Bu ${target} zaten kullanılıyor. Farklı bir değer deneyin.` },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'Tür oluşturulamadı. Lütfen tekrar deneyin.' },
      { status: 500 },
    );
  }
}
