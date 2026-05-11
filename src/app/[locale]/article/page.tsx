// ISR — 30 saniyede bir arka planda yeniden üretilir. Yeni makale
// publish edildiğinde admin tarafı `revalidateTag('articles')` çağrısı
// yaptığı için (db-cache'e bak) görünmesi için 30s beklemeye gerek yok.
export const revalidate = 30;

import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ScrollReveal from '@/components/public/ScrollReveal';
import EmptyState from '@/components/public/EmptyState';
import PageHero from '@/components/public/PageHero';
import { isSectionEnabled } from '@/lib/site-sections';
import ArticleCard, { categoryLabel } from '@/components/public/ArticleCard';

type ArticleListItem = Awaited<ReturnType<typeof loadArticles>>[number];

// Kategori sıralaması — anasayfadaki "Editor's Pick" hissini korumak için
// kültürel impact ve genre öncelikli, niş kategoriler aşağıda.
// Prisma `ArticleCategory` enum'uyla 1-1 eşleşir (schema.prisma).
const CATEGORY_ORDER = [
  'CULTURAL_IMPACT',
  'GENRE',
  'CURATED_MOVEMENT',
  'DEEP_CUT',
  'THEORY',
  'FASHION',
  'SUBCULTURE',
  'LISTENING_PATH',
  'AI_MUSIC',
] as const;

async function loadArticles() {
  return prisma.article.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      author: { select: { name: true } },
      relatedGenre: { select: { nameTr: true, nameEn: true, slug: true } },
      relatedArtist: { select: { name: true, slug: true } },
      topic: { select: { id: true, slug: true, nameTr: true, nameEn: true } },
    },
    // En yeni makaleler en üstte. featuredOrder atanmışsa onlar daha da
    // üstte (admin'in elle koyduğu sıra korunur).
    orderBy: [
      { featuredOrder: { sort: 'asc', nulls: 'last' } },
      { publishedAt: 'desc' },
    ],
  });
}

/**
 * Yayında ve en az bir makaleye bağlı topic'leri listele. Admin
 * panelinden eklenmiş ama hiç makalesi olmayan topic'i public sayfada
 * göstermenin anlamı yok — boş chip'e tıklayan kullanıcı "Hiç makale
 * bulunamadı" ekranıyla karşılaşır.
 */
async function loadTopicsWithArticles() {
  // Migration yapılmamışsa (ArticleTopic tablosu DB'de henüz yoksa)
  // sessizce boş döner — public sayfayı kırmamak için.
  try {
    return await prisma.articleTopic.findMany({
      where: {
        status: 'PUBLISHED',
        articles: { some: { status: 'PUBLISHED' } },
      },
      select: {
        id: true,
        slug: true,
        nameTr: true,
        nameEn: true,
        _count: { select: { articles: { where: { status: 'PUBLISHED' } } } },
      },
      orderBy: [{ order: 'asc' }, { nameTr: 'asc' }],
    });
  } catch (err) {
    console.warn('[articles] topic listesi çekilemedi — migration yapıldı mı?', err);
    return [] as Array<{
      id: string;
      slug: string;
      nameTr: string;
      nameEn: string;
      _count: { articles: number };
    }>;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return {
    title: dict.article?.title ?? (locale === 'tr' ? 'Makaleler' : 'Articles'),
    description: dict.article?.subtitle ?? '',
  };
}

export default async function ArticleListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(await isSectionEnabled('article'))) notFound();
  const dict = getDictionary(locale);
  const tr = locale === 'tr';

  const [articles, topics] = await Promise.all([
    loadArticles(),
    loadTopicsWithArticles(),
  ]);

  // Kategori bazlı gruplama — listede her kategori kendi başlığı altında
  // hem tarama (filtre chip'i + scroll) hem de görsel ritim sağlar.
  const grouped = new Map<string, ArticleListItem[]>();
  for (const a of articles) {
    if (!grouped.has(a.category)) grouped.set(a.category, []);
    grouped.get(a.category)!.push(a);
  }
  const orderedCategories = CATEGORY_ORDER.filter((c) => grouped.has(c));
  // Bilinmeyen / dict'te tanımsız kategoriler de en sona eklensin.
  for (const c of grouped.keys()) {
    if (!orderedCategories.includes(c as (typeof CATEGORY_ORDER)[number])) {
      orderedCategories.push(c as (typeof CATEGORY_ORDER)[number]);
    }
  }

  const featured = articles[0]; // listede en üst (featuredOrder veya en yeni).

  return (
    <div className="bg-[#0a0a0b] text-white">
      <PageHero
        eyebrow={tr ? 'Yazılar' : 'Writing'}
        title={dict.article?.title ?? (tr ? 'Makaleler' : 'Articles')}
        subtitle={dict.article?.subtitle ?? ''}
        meta={
          <div className="space-y-3">
            {/* Topic chip'leri — admin'in oluşturduğu üst başlıklar
                (Soundtracks, Arşiv vb.). Her chip kendi detay sayfasına
                gider. Hiç topic yoksa bu satır render edilmez. */}
            {topics.length > 0 && (
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold mr-1">
                  {tr ? 'Üst Başlıklar' : 'Topics'}
                </span>
                {topics.map((t) => (
                  <Link
                    key={t.id}
                    href={`/${locale}/article/topic/${t.slug}`}
                    className="px-3.5 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 text-[11px] font-semibold rounded-full transition-colors uppercase tracking-wider"
                  >
                    {tr ? t.nameTr : t.nameEn}
                    <span className="text-zinc-500 ml-1.5 font-normal">{t._count.articles}</span>
                  </Link>
                ))}
              </div>
            )}
            {/* Kategori chip'leri — sabit enum'a göre sayfa içi anchor'lar. */}
            <div className="flex gap-2 flex-wrap">
              {orderedCategories.map((cat) => {
                const count = grouped.get(cat)?.length ?? 0;
                return (
                  <a
                    key={cat}
                    href={`#cat-${cat}`}
                    className="px-3.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-white text-[11px] font-semibold rounded-full transition-colors border border-white/10 hover:border-white/20 uppercase tracking-wider"
                  >
                    {categoryLabel(dict, cat)}
                    <span className="text-white/40 ml-1.5 font-normal">{count}</span>
                  </a>
                );
              })}
            </div>
          </div>
        }
      />

      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 py-12 space-y-16">
        {articles.length === 0 && (
          <EmptyState
            title={tr ? 'Henüz yayında makale yok.' : 'No articles published yet.'}
            hint={tr ? 'Yakında — kürasyon sürüyor' : 'Coming soon — curation in progress'}
          />
        )}

        {featured && (
          <ScrollReveal direction="up">
            <ArticleCard article={featured} locale={locale} variant="hero" />
          </ScrollReveal>
        )}

        {orderedCategories.map((cat) => {
          // Hero olarak kullandığımız makaleyi bu kategorinin listesinden
          // çıkar — aynı yazı iki kez görünmesin.
          const list = (grouped.get(cat) ?? []).filter((a) => a.id !== featured?.id);
          if (list.length === 0) return null;
          return (
            <section key={cat} id={`cat-${cat}`} className="scroll-mt-24">
              <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
                {categoryLabel(dict, cat)}
                <span className="text-xs text-zinc-600 font-normal">({list.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((a, i) => (
                  <ScrollReveal key={a.id} delay={i * 40} direction="up">
                    <ArticleCard article={a} locale={locale} />
                  </ScrollReveal>
                ))}
              </div>
            </section>
          );
        })}

      </div>
    </div>
  );
}
