export const revalidate = 30;

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';

/**
 * Prerender every genre at build time. <Link> prefetch pulls the full RSC
 * payload so clicks are instant; new genres fall back to on-demand ISR.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const genres: Array<{ slug: string }> = await prisma.genre.findMany({
    select: { slug: true },
  });
  return genres.map(({ slug }) => ({ slug }));
}
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/i18n';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { isSectionEnabled } from '@/lib/site-sections';

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const genre = await prisma.genre.findUnique({
    where: { slug },
    select: {
      nameTr: true,
      nameEn: true,
      descriptionTr: true,
      descriptionEn: true,
      image: true,
    },
  });
  if (!genre) {
    return { title: locale === 'tr' ? 'Tür bulunamadı' : 'Genre not found' };
  }
  return buildPageMetadata({
    title: locale === 'tr' ? genre.nameTr : genre.nameEn,
    description: locale === 'tr' ? genre.descriptionTr : genre.descriptionEn,
    locale,
    path: `/genre/${slug}`,
    image: genre.image,
  });
}

export default async function GenreDetailPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!(await isSectionEnabled('genre'))) notFound();
  const dict = getDictionary(locale);
  const tr = locale === 'tr';

  const genre = await prisma.genre.findUnique({
    where: { slug },
    include: {
      parent: true,
      children: { orderBy: { nameTr: 'asc' } },
      articles: {
        where: { status: 'PUBLISHED' },
        include: { author: { select: { name: true } } },
        orderBy: { publishedAt: 'desc' },
      },
      artists: {
        include: { artist: { include: { genres: { include: { genre: true } } } } },
        take: 20,
      },
    },
  });

  if (!genre) notFound();

  const name = tr ? genre.nameTr : genre.nameEn;
  const description = tr ? genre.descriptionTr : genre.descriptionEn;
  const parentName = genre.parent ? (tr ? genre.parent.nameTr : genre.parent.nameEn) : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description: description || undefined,
    url: `${SITE_URL}/${locale}/genre/${slug}`,
    image: genre.image || undefined,
    inLanguage: tr ? 'tr-TR' : 'en-US',
    about: { '@type': 'Thing', name },
    ...(genre.parent
      ? {
          isPartOf: {
            '@type': 'CollectionPage',
            name: parentName,
            url: `${SITE_URL}/${locale}/genre/${genre.parent.slug}`,
          },
        }
      : {}),
    ...(genre.artists.length > 0
      ? {
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: genre.artists.length,
            itemListElement: genre.artists.map(({ artist }, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `${SITE_URL}/${locale}/artist/${artist.slug}`,
              name: artist.name,
            })),
          },
        }
      : {}),
  };

  return (
    <div className="bg-[#0a0a0b] text-white">
      <JsonLd data={jsonLd} />

      {/* ▸▸▸ HERO — homepage/article hero'sunun dili: arka plan görseli,
          çift gradient, alt-hizalı eyebrow + Fraunces başlık + kısa meta.
          Açıklama metni hero içinde değil body kolonunda okunuyor. */}
      <section className="relative w-full min-h-[60vh] md:min-h-[70vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          {genre.image ? (
            <img src={genre.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-[#0a0a0b]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_55%)]" />
              <span
                className="absolute top-10 right-10 font-editorial font-black text-white/5 leading-none select-none"
                style={{ fontSize: 'clamp(8rem, 20vw, 20rem)' }}
                aria-hidden="true"
              >
                {name?.charAt(0)}
              </span>
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-black/55 to-black/30" />
        </div>

        <div className="relative z-10 w-full max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 pb-14 md:pb-20 pt-32">
          <nav aria-label="Breadcrumb" className="text-[11px] md:text-[12px] tracking-[0.3em] uppercase font-bold text-zinc-300 mb-7 flex items-center gap-3 flex-wrap">
            <span className="w-10 h-px bg-zinc-500" />
            <Link href={`/${locale}/genre`} className="text-zinc-400 hover:text-white underline-grow pb-1">{dict.nav.genre}</Link>
            {genre.parent && (
              <>
                <span className="text-zinc-600">/</span>
                <Link href={`/${locale}/genre/${genre.parent.slug}`} className="text-zinc-400 hover:text-white underline-grow pb-1">
                  {parentName}
                </Link>
              </>
            )}
            <span className="text-zinc-600">/</span>
            <span className="text-white" aria-current="page">{name}</span>
          </nav>

          <h1
            className="font-editorial leading-[1] tracking-[-0.025em] max-w-4xl"
            style={{ fontSize: 'clamp(2.25rem, 5vw, 4.5rem)', fontWeight: 700 }}
          >
            {name}
          </h1>

          <div className="mt-8 flex items-center gap-5 text-[13px] text-zinc-400 font-medium">
            {genre.artists.length > 0 && (
              <span>{genre.artists.length} {tr ? 'sanatçı' : 'artists'}</span>
            )}
            {genre.articles.length > 0 && (
              <>
                <span className="w-8 h-px bg-zinc-600" aria-hidden="true" />
                <span>{genre.articles.length} {tr ? 'makale' : 'articles'}</span>
              </>
            )}
            {genre.children.length > 0 && (
              <>
                <span className="w-8 h-px bg-zinc-600" aria-hidden="true" />
                <span>{genre.children.length} {dict.genre.subgenres.toLowerCase()}</span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ▸▸▸ BODY — iki kolon: solda açıklama + makale listesi (okunan
          içerik), sağda subgenre chips + sanatçı listesi (yardımcı
          navigasyon). Makale sayfasındaki reading column genişliğine
          yakın tutuldu (~max-w-3xl). */}
      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 py-16 md:py-24 grid lg:grid-cols-12 gap-12 lg:gap-16">
        <div className="lg:col-span-8 space-y-16">
          {description && (
            <section>
              <p className="text-zinc-500 text-[11px] tracking-[0.3em] uppercase font-bold mb-4">
                {tr ? 'Hakkında' : 'About'}
              </p>
              <div className="article-body max-w-none">
                <p>{description}</p>
              </div>
            </section>
          )}

          {genre.articles.length > 0 ? (
            <section aria-labelledby="genre-articles">
              <p className="text-zinc-500 text-[11px] tracking-[0.3em] uppercase font-bold mb-6">
                {dict.genre.articles}
              </p>
              <div className="space-y-1 border-t border-white/10">
                {genre.articles.map((article) => {
                  const title = tr ? article.titleTr : article.titleEn;
                  const date = article.publishedAt
                    ? new Date(article.publishedAt).toLocaleDateString(tr ? 'tr-TR' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : null;
                  return (
                    <Link
                      key={article.id}
                      href={`/${locale}/article/${article.slug}`}
                      className="group flex gap-6 py-6 border-b border-white/10 hover:bg-white/[0.02] transition-colors -mx-4 px-4 rounded-sm"
                    >
                      <div className="w-20 h-20 md:w-28 md:h-28 flex-shrink-0 relative overflow-hidden rounded-lg bg-zinc-900">
                        {article.featuredImage ? (
                          <img src={article.featuredImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
                            <span className="absolute inset-0 flex items-center justify-center font-editorial font-black text-white/15 text-3xl leading-none">
                              {title?.charAt(0) ?? '♪'}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold mb-2">
                          {article.category.replace(/_/g, ' ')}
                        </p>
                        <h3 className="font-editorial text-lg md:text-2xl font-bold leading-tight tracking-[-0.01em] group-hover:underline decoration-1 underline-offset-4">
                          {title}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-3 flex items-center gap-3">
                          <span>{article.author.name}</span>
                          {date && (
                            <>
                              <span className="w-5 h-px bg-zinc-700" aria-hidden="true" />
                              <span>{date}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="border-t border-white/10 pt-12 text-center">
              <p className="text-zinc-500 italic text-sm font-light">
                {tr ? 'Henüz bu tür için yayımlanmış bir makale yok.' : 'No articles published for this genre yet.'}
              </p>
            </section>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-12 lg:sticky lg:top-24 lg:self-start">
          {genre.children.length > 0 && (
            <div>
              <p className="text-zinc-500 text-[11px] tracking-[0.3em] uppercase font-bold mb-4">
                {dict.genre.subgenres}
              </p>
              <div className="flex flex-wrap gap-2">
                {genre.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/${locale}/genre/${child.slug}`}
                    className="px-3 py-1.5 bg-white/[0.03] border border-white/10 rounded-full text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08] hover:border-white/30 transition-colors"
                  >
                    {tr ? child.nameTr : child.nameEn}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {genre.artists.length > 0 && (
            <div>
              <p className="text-zinc-500 text-[11px] tracking-[0.3em] uppercase font-bold mb-4">
                {dict.genre.artists}
              </p>
              <ul className="space-y-3">
                {genre.artists.map(({ artist }) => (
                  <li key={artist.id}>
                    <Link
                      href={`/${locale}/artist/${artist.slug}`}
                      className="group flex items-center gap-3 py-1.5"
                    >
                      <span className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-zinc-900 relative">
                        {artist.image ? (
                          <img src={artist.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">♪</span>
                        )}
                      </span>
                      <span className="text-sm text-zinc-300 group-hover:text-white group-hover:underline underline-offset-4 transition-colors">
                        {artist.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
