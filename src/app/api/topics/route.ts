/**
 * Makale "üst başlık / topic" CRUD endpoint'i. Genre route'u ile aynı
 * pattern — `requireSectionAccess('ARTICLE', ...)` kullanıyoruz çünkü
 * Topic Article'a bağlı bir gruplama katmanı, ayrı bir permission
 * section değil (sidebar bile aynı 'ARTICLE' bayrağıyla görünür).
 *
 * Anonim istek → sadece PUBLISHED; admin oturumu → tümü (admin liste
 * sayfasında draft + pending görünmesi gerek).
 */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess, isAdminRequest } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';
import { resolveCreateStatus, maybeCreateReviewOnCreate } from '@/lib/content-review';
import { publicApiRateLimit } from '@/lib/rate-limit';
import { audit, extractContext } from '@/lib/audit-log';

export async function GET(request: NextRequest) {
  const limited = await publicApiRateLimit(request, 'topics');
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20')), 100);
  const all = searchParams.get('all') === 'true';

  const isAdmin = await isAdminRequest();
  const statusWhere = isAdmin ? {} : { status: 'PUBLISHED' as const };

  if (all) {
    const topics = await prisma.articleTopic.findMany({
      where: statusWhere,
      include: { _count: { select: { articles: true } } },
      orderBy: [{ order: 'asc' }, { nameTr: 'asc' }],
    });
    return NextResponse.json(topics);
  }

  const [items, total] = await Promise.all([
    prisma.articleTopic.findMany({
      where: statusWhere,
      include: { _count: { select: { articles: true } } },
      orderBy: [{ order: 'asc' }, { nameTr: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.articleTopic.count({ where: statusWhere }),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSectionAccess('ARTICLE', 'canCreate');
  if (error || !user) return error;

  const body = await request.json();
  const { nameTr, nameEn, descriptionTr, descriptionEn, image, order } = body;

  if (!nameTr || !nameEn) {
    return NextResponse.json({ error: 'Name (TR and EN) is required' }, { status: 400 });
  }

  // Topic kendi statüsünü Article'la aynı onay akışında taşır — canPublish
  // yetkisi olmayan editör topic oluşturursa PENDING_REVIEW'a düşer.
  const { status, requiresReview } = await resolveCreateStatus({
    section: 'ARTICLE',
    userId: user.id,
  });

  const slug = slugify(nameEn);

  // Duplicate slug (aynı nameEn ile iki topic) — generic 500 yerine 409
  // ile anlamlı bir hata mesajı dön ki kullanıcı admin formunda "bu isim
  // zaten kullanılıyor" görsün.
  let topic;
  try {
    topic = await prisma.articleTopic.create({
      data: {
        slug,
        nameTr,
        nameEn,
        descriptionTr: descriptionTr || null,
        descriptionEn: descriptionEn || null,
        image: image || null,
        order: order || 0,
        status,
      },
    });
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code === 'P2002') {
      return NextResponse.json(
        { error: `"${nameEn}" zaten kullanılıyor. Farklı bir isim seç.` },
        { status: 409 },
      );
    }
    throw err;
  }

  await maybeCreateReviewOnCreate({
    section: 'ARTICLE_TOPIC',
    entityId: topic.id,
    entityTitle: topic.nameTr,
    userId: user.id,
    status,
  });

  const ctx = extractContext(request);
  await audit({
    event: 'ARTICLE_TOPIC_CREATED',
    actorId: user.id,
    targetId: topic.id,
    targetType: 'ARTICLE_TOPIC',
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    detail: topic.nameTr,
  });

  // Topic değişince hem article hem topic cache'ini düşür — public liste
  // ve detay sayfaları topic verisi okuyor. ISR sayfaları (revalidate=30)
  // unstable_cache kullanmadığı için `revalidateTag` tek başına yetmez;
  // `revalidatePath` ile public rotaları da düşürüyoruz.
  revalidateTag(CACHE_TAGS.article, 'max');
  revalidateTag(CACHE_TAGS.articleTopic, 'max');
  revalidatePath('/[locale]/article', 'page');
  revalidatePath('/[locale]/article/topic/[slug]', 'page');
  return NextResponse.json({ ...topic, requiresReview }, { status: 201 });
}
