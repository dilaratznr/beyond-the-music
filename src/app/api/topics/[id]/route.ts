/**
 * Tek topic için GET / PUT / DELETE.
 *
 * Silme davranışı: Article.topicId FK'sı `onDelete: SetNull` ile
 * tanımlı — topic silinirse makaleler kaybolmaz, sadece topic
 * bağlantıları null'a düşer. Genre delete'inde olduğu gibi 409
 * + force=true ile typed-confirm akışını destekliyoruz.
 */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';
import { resolveEditStatus, getLastRejection } from '@/lib/content-review';
import { audit, extractContext } from '@/lib/audit-log';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topic = await prisma.articleTopic.findUnique({
    where: { id },
    include: {
      _count: { select: { articles: true } },
    },
  });
  if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  const lastRejection = await getLastRejection('ARTICLE_TOPIC', id);
  return NextResponse.json({ ...topic, lastRejection });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireSectionAccess('ARTICLE', 'canEdit');
  if (error || !user) return error;

  const { id } = await params;
  const body = await request.json();
  const { nameTr, nameEn, descriptionTr, descriptionEn, image, order } = body;

  const existing = await prisma.articleTopic.findUnique({
    where: { id },
    select: { nameTr: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });

  const { status: nextStatus, requiresReview } = await resolveEditStatus({
    section: 'ARTICLE_TOPIC',
    userId: user.id,
    entityId: id,
    // Boş string'i de fallback'e düşür — `??` sadece null/undefined kapsar,
    // kullanıcı nameTr alanını silip kaydederse boş string review kuyruğuna
    // girerdi; `||` ile mevcut başlığa düşeriz.
    entityTitle: nameTr || existing.nameTr,
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
  if (order !== undefined) data.order = order;

  // Duplicate slug (yeni nameEn → mevcut başka topic ile çakışıyor) — generic
  // 500 yerine anlamlı 409 dön.
  let topic;
  try {
    topic = await prisma.articleTopic.update({ where: { id }, data });
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code === 'P2002') {
      return NextResponse.json(
        { error: 'Bu slug zaten başka bir üst başlık tarafından kullanılıyor.' },
        { status: 409 },
      );
    }
    throw err;
  }

  const ctx = extractContext(request);
  await audit({
    event: 'ARTICLE_TOPIC_UPDATED',
    actorId: user.id,
    targetId: topic.id,
    targetType: 'ARTICLE_TOPIC',
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    detail: topic.nameTr,
  });

  // ISR sayfalarını da düşür — sadece tag yetmez (revalidate=30, unstable_cache yok).
  revalidateTag(CACHE_TAGS.article, 'max');
  revalidateTag(CACHE_TAGS.articleTopic, 'max');
  revalidatePath('/[locale]/article', 'page');
  revalidatePath('/[locale]/article/topic/[slug]', 'page');
  return NextResponse.json({ ...topic, requiresReview });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireSectionAccess('ARTICLE', 'canDelete');
  if (error || !user) return error;

  const { id } = await params;
  const force = new URL(request.url).searchParams.get('force') === 'true';

  const topic = await prisma.articleTopic.findUnique({
    where: { id },
    select: { id: true, nameTr: true },
  });
  if (!topic) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  const articleCount = await prisma.article.count({ where: { topicId: id } });
  const inUse = articleCount > 0;

  // İlk tıklama → 409 + typed-confirm modal; force=true ile gelen ikinci
  // istekte silme tamamlanır. Article.topicId FK'sı `onDelete: SetNull`
  // ile tanımlı olduğu için cascade otomatik: makaleler kalır, sadece
  // topic bağlantıları null'a düşer. Ayrıca explicit updateMany gerekmiyor.
  if (inUse && !force) {
    return NextResponse.json(
      {
        error: 'Topic in use',
        requiresConfirmation: true,
        impact: { articles: articleCount },
        message:
          `"${topic.nameTr}" üst başlığı ${articleCount} makaleye bağlı. ` +
          `Silersen makaleler kalır ama topic bağlantıları temizlenir ` +
          `(makaleleri başka bir topic'e yeniden bağlayabilirsin).`,
      },
      { status: 409 },
    );
  }

  await prisma.articleTopic.delete({ where: { id } });

  const ctx = extractContext(request);
  await audit({
    event: 'ARTICLE_TOPIC_DELETED',
    actorId: user.id,
    targetId: id,
    targetType: 'ARTICLE_TOPIC',
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    detail: topic.nameTr,
  });

  revalidateTag(CACHE_TAGS.article, 'max');
  revalidateTag(CACHE_TAGS.articleTopic, 'max');
  revalidatePath('/[locale]/article', 'page');
  revalidatePath('/[locale]/article/topic/[slug]', 'page');

  return NextResponse.json({ success: true });
}
