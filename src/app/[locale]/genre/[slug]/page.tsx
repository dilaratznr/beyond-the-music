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
        include: { artist: true },
        take: 20,
      },
    },
  });

  if (!genre) notFound();

  const name = locale === 'tr' ? genre.nameTr : genre.nameEn;
  const description = locale === 'tr' ? genre.descriptionTr : genre.descriptionEn;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description: description || undefined,
    url: `${SITE_URL}/${locale}/genre/${slug}`,
    image: genre.image || undefined,
    inLanguage: locale === 'tr' ? 'tr-TR' : 'en-US',
    about: {
      '@type': 'Thing',
      name,
    },
    ...(genre.parent
      ? {
          isPartOf: {
            '@type': 'CollectionPage',
            name: locale === 'tr' ? genre.parent.nameTr : genre.parent.nameEn,
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
    <div className="bg-[#0a0a0b] text-white min-h-screen pt-20">
    <JsonLd data={jsonLd} />
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm text-zinc-500 mb-4">
        <Link href={`/${locale}/genre`} className="hover:text-white">{dict.nav.genre}</Link>
        {genre.parent && (
          <><span className="mx-1">/</span><Link href={`/${locale}/genre/${genre.parent.slug}`} className="hover:text-white">{locale === 'tr' ? genre.parent.nameTr : genre.parent.nameEn}</Link></>
        )}
        <span className="mx-1">/</span>
        <span className="text-white font-medium" aria-current="page">{name}</span>
      </nav>

      <div className="grid md:grid-cols-3 gap-12">
        {/* Content */}
        <div className="md:col-span-2">
          <h1 className="text-3xl md:text-4xl font-bold mb-6">{name}</h1>
          {description && (
            <div className="prose prose-zinc max-w-none text-zinc-300 leading-relaxed">
              <p>{description}</p>
            </div>
          )}

          {/* Articles */}
          {genre.articles.length > 0 && (
            <section className="mt-12 space-y-6" aria-labelledby="genre-articles">
              <h2 id="genre-articles" className="font-bold text-xl mb-3">{dict.genre.articles}</h2>
              {genre.articles.map((article) => (
                <Link key={article.id} href={`/${locale}/article/${article.slug}`}
                  className="block p-6 bg-zinc-900 rounded-xl hover:shadow-md transition-shadow">
                  <span className="text-xs text-zinc-500 uppercase">{article.category.replace(/_/g, ' ')}</span>
                  <h3 className="text-xl font-bold mt-1">{locale === 'tr' ? article.titleTr : article.titleEn}</h3>
                  <p className="text-sm text-zinc-500 mt-2">{article.author.name}</p>
                </Link>
              ))}
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-8">
          {genre.image && (
            <img src={genre.image} alt={name} loading="lazy" decoding="async" className="w-full rounded-xl" />
          )}

          {genre.children.length > 0 && (
            <div>
              <h2 className="font-bold text-lg mb-3">{dict.genre.subgenres}</h2>
              <div className="flex flex-wrap gap-2">
                {genre.children.map((child) => (
                  <Link key={child.id} href={`/${locale}/genre/${child.slug}`}
                    className="px-3 py-1 bg-zinc-800 rounded-full text-sm hover:bg-zinc-700 transition-colors">
                    {locale === 'tr' ? child.nameTr : child.nameEn}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {genre.artists.length > 0 && (
            <div>
              <h2 className="font-bold text-lg mb-3">{dict.genre.artists}</h2>
              <ul className="space-y-2">
                {genre.artists.map(({ artist }) => (
                  <li key={artist.id}>
                    <Link href={`/${locale}/artist/${artist.slug}`} className="text-sm text-zinc-400 hover:text-white">
                      {artist.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
    </div>
  );
}
