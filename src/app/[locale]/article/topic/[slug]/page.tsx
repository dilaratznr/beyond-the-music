/**
 * Topic detay sayfası — belli bir üst başlığa bağlı yayında makaleleri
 * gösterir. ISR ile cache'leniyor; admin tarafı topic veya makale
 * değiştirdiğinde `revalidateTag('articleTopic'/'article')` ile düşer.
 */
export const revalidate = 30;

import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ScrollReveal from '@/components/public/ScrollReveal';
import EmptyState from '@/components/public/EmptyState';
import PageHero from '@/components/public/PageHero';
import { isSectionEnabled } from '@/lib/site-sections';
import ArticleCard from '@/components/public/ArticleCard';

async function loadTopicBySlug(slug: string) {
  try {
    return await prisma.articleTopic.findUnique({
      where: { slug },
      include: {
        articles: {
          where: { status: 'PUBLISHED' },
          include: {
            author: { select: { name: true } },
          },
          orderBy: [
            { featuredOrder: { sort: 'asc', nulls: 'last' } },
            { publishedAt: 'desc' },
          ],
        },
      },
    });
  } catch (err) {
    console.warn('[article/topic] loadTopicBySlug error', err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const topic = await loadTopicBySlug(slug);
  const tr = locale === 'tr';
  if (!topic) {
    return {
      title: tr ? 'Üst Başlık bulunamadı' : 'Topic not found',
    };
  }
  const name = tr ? topic.nameTr : topic.nameEn;
  const desc = tr ? topic.descriptionTr : topic.descriptionEn;
  return {
    title: name,
    description: desc || undefined,
  };
}

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!(await isSectionEnabled('article'))) notFound();
  const dict = getDictionary(locale);
  const tr = locale === 'tr';

  const topic = await loadTopicBySlug(slug);
  if (!topic || topic.status !== 'PUBLISHED') notFound();

  const articles = topic.articles;
  const name = tr ? topic.nameTr : topic.nameEn;
  const desc = tr ? topic.descriptionTr : topic.descriptionEn;

  return (
    <div className="bg-[#0a0a0b] text-white">
      <PageHero
        eyebrow={
          <Link
            href={`/${locale}/article`}
            className="text-white/60 hover:text-white transition-colors"
          >
            ← {dict.article?.title ?? (tr ? 'Makaleler' : 'Articles')}
          </Link>
        }
        title={name}
        subtitle={desc ?? undefined}
        meta={
          <div className="text-[11px] uppercase tracking-wider text-white/40 font-bold">
            {articles.length}{' '}
            {tr
              ? articles.length === 1
                ? 'makale'
                : 'makale'
              : articles.length === 1
                ? 'article'
                : 'articles'}
          </div>
        }
      />

      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 py-12 space-y-12">
        {articles.length === 0 ? (
          <EmptyState
            title={tr ? 'Bu üst başlıkta henüz makale yok.' : 'No articles under this topic yet.'}
            hint={tr ? 'Yakında — kürasyon sürüyor' : 'Coming soon — curation in progress'}
          />
        ) : (
          <>
            {/* İlk makale hero olarak, geri kalan grid'de. */}
            <ScrollReveal direction="up">
              <ArticleCard article={articles[0]} locale={locale} variant="hero" />
            </ScrollReveal>
            {articles.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {articles.slice(1).map((a, i) => (
                  <ScrollReveal key={a.id} delay={i * 40} direction="up">
                    <ArticleCard article={a} locale={locale} />
                  </ScrollReveal>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
