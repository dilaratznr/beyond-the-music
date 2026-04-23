export const revalidate = 30;

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';

/**
 * Prerender every listening path at build time. New paths fall back to
 * on-demand ISR.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const paths: Array<{ slug: string }> = await prisma.listeningPath.findMany({
    select: { slug: true },
  });
  return paths.map(({ slug }) => ({ slug }));
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
  const path = await prisma.listeningPath.findUnique({
    where: { slug },
    select: {
      titleTr: true,
      titleEn: true,
      descriptionTr: true,
      descriptionEn: true,
      image: true,
    },
  });
  if (!path) {
    return { title: locale === 'tr' ? 'Rota bulunamadı' : 'Path not found' };
  }
  return buildPageMetadata({
    title: locale === 'tr' ? path.titleTr : path.titleEn,
    description: locale === 'tr' ? path.descriptionTr : path.descriptionEn,
    locale,
    path: `/listening-paths/${slug}`,
    image: path.image,
  });
}

export default async function ListeningPathDetailPage({
  params,
}: {
  params: Params;
}) {
  const { locale, slug } = await params;
  if (!(await isSectionEnabled('listeningPaths'))) notFound();
  const dict = getDictionary(locale);

  const path = await prisma.listeningPath.findUnique({
    where: { slug },
    include: {
      items: {
        orderBy: { order: 'asc' },
        include: {
          song: { include: { album: { include: { artist: true } } } },
          album: { include: { artist: true } },
          artist: true,
        },
      },
    },
  });

  if (!path) notFound();

  const typeLabels: Record<string, string> = {
    EMOTION: dict.listeningPaths.emotion,
    ERA: dict.listeningPaths.era,
    CITY: dict.listeningPaths.city,
    CONTRAST: dict.listeningPaths.contrast,
    INTRO: dict.listeningPaths.intro,
    DEEP: dict.listeningPaths.deep,
  };

  const title = locale === 'tr' ? path.titleTr : path.titleEn;
  const description = locale === 'tr' ? path.descriptionTr : path.descriptionEn;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    description: description || undefined,
    url: `${SITE_URL}/${locale}/listening-paths/${slug}`,
    image: path.image || undefined,
    inLanguage: locale === 'tr' ? 'tr-TR' : 'en-US',
    numberOfItems: path.items.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: path.items.map((item, i) => {
      let name = '';
      let url: string | undefined;
      if (item.song) {
        name = item.song.title;
        url = `${SITE_URL}/${locale}/artist/${item.song.album.artist.slug}`;
      } else if (item.album) {
        name = item.album.title;
        url = `${SITE_URL}/${locale}/album/${item.album.slug}`;
      } else if (item.artist) {
        name = item.artist.name;
        url = `${SITE_URL}/${locale}/artist/${item.artist.slug}`;
      }
      return {
        '@type': 'ListItem',
        position: i + 1,
        name,
        url,
      };
    }),
  };

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen">
      <JsonLd data={jsonLd} />
      <section className="relative pt-28 pb-16 overflow-hidden">
        {path.image && (
          <div className="absolute inset-0">
            <img
              src={path.image}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0b]/60 to-[#0a0a0b]" />
          </div>
        )}
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-sm text-zinc-500 mb-4">
            <Link
              href={`/${locale}/listening-paths`}
              className="hover:text-white"
            >
              {dict.listeningPaths.title}
            </Link>
            <span className="mx-1">/</span>
            <span className="text-white font-medium">{title}</span>
          </div>
          <span className="inline-block px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-full mb-3">
            {typeLabels[path.type] || path.type}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            {title}
          </h1>
          {description && (
            <p className="text-zinc-300 max-w-2xl text-base leading-relaxed">
              {description}
            </p>
          )}
          <p className="text-xs text-zinc-500 mt-6 uppercase tracking-widest">
            {path.items.length === 0
              ? (locale === 'tr' ? 'Henüz parça yok' : 'No tracks yet')
              : `${path.items.length} ${locale === 'tr' ? 'parça' : 'tracks'}`}
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 pb-20">
        {path.items.length === 0 ? (
          <p className="text-zinc-500 text-center py-12">
            {locale === 'tr'
              ? 'Bu rota henüz hazırlanıyor.'
              : 'This path is still being curated.'}
          </p>
        ) : (
          <ol className="space-y-4">
            {path.items.map((item, idx) => {
              const note = locale === 'tr' ? item.noteTr : item.noteEn;
              let label = '—';
              let sub = '';
              let href: string | null = null;
              let cover: string | null = null;

              if (item.song) {
                label = item.song.title;
                sub = `${item.song.album.artist.name} · ${item.song.album.title}`;
                href = `/${locale}/artist/${item.song.album.artist.slug}`;
                cover = item.song.album.coverImage;
              } else if (item.album) {
                label = item.album.title;
                sub = item.album.artist.name;
                href = `/${locale}/artist/${item.album.artist.slug}`;
                cover = item.album.coverImage;
              } else if (item.artist) {
                label = item.artist.name;
                sub = locale === 'tr' ? 'Sanatçı' : 'Artist';
                href = `/${locale}/artist/${item.artist.slug}`;
                cover = item.artist.image;
              }

              const content = (
                <div className="flex gap-4 items-start p-4 bg-zinc-900/60 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-colors">
                  <div className="flex-shrink-0 w-10 text-center">
                    <span className="text-xl font-bold text-emerald-500/70">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>
                  {cover ? (
                    <img
                      src={cover}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-600 flex-shrink-0">
                      ◉
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white truncate">
                      {label}
                    </h3>
                    {sub && (
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">
                        {sub}
                      </p>
                    )}
                    {note && (
                      <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
                        {note}
                      </p>
                    )}
                    {item.song && (item.song.spotifyUrl || item.song.youtubeUrl) && (
                      <div className="flex gap-3 mt-3">
                        {item.song.spotifyUrl && (
                          <a
                            href={item.song.spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Spotify →
                          </a>
                        )}
                        {item.song.youtubeUrl && (
                          <a
                            href={item.song.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-rose-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            YouTube →
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );

              return (
                <li key={item.id}>
                  {href ? (
                    <Link href={href} className="block">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
