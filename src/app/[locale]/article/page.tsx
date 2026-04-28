// ISR — 30 saniyede bir arka planda yeniden üretilir. Yeni makale
// publish edildiğinde admin tarafı `revalidateTag('articles')` çağrısı
// yaptığı için (db-cache'e bak) görünmesi için 30s beklemeye gerek yok.
export const revalidate = 30;

import { getDictionary, type Dictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ScrollReveal from '@/components/public/ScrollReveal';
import EmptyState from '@/components/public/EmptyState';
import PageHero from '@/components/public/PageHero';
import { isSectionEnabled } from '@/lib/site-sections';
import { stripHtml } from '@/lib/seo';

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
    },
    // En yeni makaleler en üstte. featuredOrder atanmışsa onlar daha da
    // üstte (admin'in elle koyduğu sıra korunur).
    orderBy: [
      { featuredOrder: { sort: 'asc', nulls: 'last' } },
      { publishedAt: 'desc' },
    ],
  });
}

function categoryLabel(dict: Dictionary, category: string): string {
  // article.categories sözlüğünden al; eşleşme yoksa enum'un kendisini
  // human-readable hale getir (CULTURAL_IMPACT → "Cultural Impact").
  const fromDict = (dict.article?.categories as Record<string, string> | undefined)?.[category];
  if (fromDict) return fromDict;
  return category
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function ArticleCard({
  article,
  locale,
  variant = 'standard',
}: {
  article: ArticleListItem;
  locale: string;
  variant?: 'hero' | 'standard';
}) {
  const tr = locale === 'tr';
  const title = tr ? article.titleTr : article.titleEn;
  const content = tr ? article.contentTr : article.contentEn;
  const excerpt = stripHtml(content, variant === 'hero' ? 220 : 140);
  const dict = getDictionary(locale);
  const catLabel = categoryLabel(dict, article.category);

  if (variant === 'hero') {
    return (
      <Link
        href={`/${locale}/article/${article.slug}`}
        className="group relative block rounded-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9] bg-gradient-to-br from-zinc-800 via-zinc-900 to-black hover-lift card-shine"
      >
        {article.featuredImage ? (
          <img
            src={article.featuredImage}
            alt=""
            loading="eager"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10">
          <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-[10px] font-bold text-white uppercase tracking-widest mb-4">
            {catLabel}
          </span>
          <h3 className="text-2xl md:text-4xl lg:text-5xl font-black font-editorial leading-tight tracking-[-0.02em] max-w-3xl group-hover:underline decoration-2 underline-offset-4">
            {title}
          </h3>
          {excerpt && (
            <p className="text-zinc-300 text-sm md:text-base mt-3 max-w-2xl line-clamp-2 font-light">
              {excerpt}
            </p>
          )}
          <div className="text-zinc-500 text-[11px] mt-4 uppercase tracking-widest font-bold">
            {article.author.name}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/${locale}/article/${article.slug}`}
      className="group relative flex flex-col rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/10 transition-colors hover-lift"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-950">
        {article.featuredImage ? (
          <img
            src={article.featuredImage}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,rgba(255,255,255,0.08),transparent_60%)]" />
        )}
        <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-[9px] font-bold text-white uppercase tracking-widest z-10">
          {catLabel}
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-base font-bold leading-snug line-clamp-2 group-hover:underline decoration-1 underline-offset-2">
          {title}
        </h3>
        {excerpt && (
          <p className="text-zinc-500 text-xs mt-2 line-clamp-3 leading-relaxed font-light flex-1">
            {excerpt}
          </p>
        )}
        <div className="text-zinc-600 text-[10px] mt-3 uppercase tracking-widest font-bold">
          {article.author.name}
        </div>
      </div>
    </Link>
  );
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

  const articles = await loadArticles();

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
