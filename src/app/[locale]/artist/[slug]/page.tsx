export const revalidate = 30;

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/i18n';
import { buildPageMetadata, stripHtml, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { isSectionEnabled } from '@/lib/site-sections';

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const artist = await prisma.artist.findUnique({
    where: { slug },
    select: { name: true, bioTr: true, bioEn: true, image: true },
  });
  if (!artist) {
    return { title: locale === 'tr' ? 'Sanatçı bulunamadı' : 'Artist not found' };
  }
  return buildPageMetadata({
    title: artist.name,
    description: stripHtml(locale === 'tr' ? artist.bioTr : artist.bioEn),
    locale,
    path: `/artist/${slug}`,
    image: artist.image,
    type: 'profile',
  });
}

export default async function ArtistDetailPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!(await isSectionEnabled('artist'))) notFound();
  const dict = getDictionary(locale);

  const artist = await prisma.artist.findUnique({
    where: { slug },
    include: {
      genres: { include: { genre: true } },
      albums: { include: { songs: true }, orderBy: { releaseDate: 'desc' } },
      articles: { where: { status: 'PUBLISHED' }, include: { author: { select: { name: true } } } },
      architects: { include: { architect: true } },
    },
  });

  if (!artist) notFound();

  const bio = locale === 'tr' ? artist.bioTr : artist.bioEn;
  const deepCuts = artist.albums.flatMap((a) => a.songs.filter((s) => s.isDeepCut));
  const typeLabel =
    artist.type === 'SOLO'
      ? dict.artist.solo
      : artist.type === 'GROUP'
        ? dict.artist.group
        : dict.artist.composer;

  const schemaType = artist.type === 'GROUP' ? 'MusicGroup' : 'Person';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: artist.name,
    description: stripHtml(bio),
    image: artist.image || undefined,
    url: `${SITE_URL}/${locale}/artist/${slug}`,
    genre: artist.genres.map(({ genre }) =>
      locale === 'tr' ? genre.nameTr : genre.nameEn,
    ),
    ...(artist.birthDate && schemaType === 'Person'
      ? { birthDate: new Date(artist.birthDate).toISOString().slice(0, 10) }
      : {}),
    ...(artist.deathDate && schemaType === 'Person'
      ? { deathDate: new Date(artist.deathDate).toISOString().slice(0, 10) }
      : {}),
    ...(artist.albums.length > 0
      ? {
          album: artist.albums.map((a) => ({
            '@type': 'MusicAlbum',
            name: a.title,
            url: `${SITE_URL}/${locale}/album/${a.slug}`,
            datePublished: a.releaseDate?.toISOString(),
          })),
        }
      : {}),
  };

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen pt-20">
    <JsonLd data={jsonLd} />
    <div className="max-w-7xl mx-auto px-6 py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-zinc-500 mb-4">
        <Link href={`/${locale}/artist`} className="hover:text-white">{dict.nav.artist}</Link>
        <span className="mx-1">/</span>
        <span className="text-white font-medium" aria-current="page">{artist.name}</span>
      </nav>

      <div className="grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{artist.name}</h1>
          <div className="flex gap-2 mb-6 flex-wrap">
            <span className="px-3 py-1 bg-zinc-800 rounded-full text-sm">{typeLabel}</span>
            {artist.genres.map(({ genre }) => (
              <Link key={genre.id} href={`/${locale}/genre/${genre.slug}`}
                className="px-3 py-1 bg-[#0a0a0b] text-white rounded-full text-sm hover:bg-zinc-800">
                {locale === 'tr' ? genre.nameTr : genre.nameEn}
              </Link>
            ))}
          </div>

          {bio && <div className="prose prose-zinc max-w-none mb-12"><p className="text-zinc-300 leading-relaxed whitespace-pre-line">{bio}</p></div>}

          {/* Albums */}
          {artist.albums.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">{dict.artist.albums}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {artist.albums.map((album) => (
                  <Link key={album.id} href={`/${locale}/album/${album.slug}`} className="bg-zinc-900 rounded-xl overflow-hidden hover:bg-zinc-800 transition-colors">
                    {album.coverImage ? (
                      <img src={album.coverImage} alt={album.title} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-zinc-800 flex items-center justify-center text-3xl" aria-hidden="true">◉</div>
                    )}
                    <div className="p-3">
                      <h3 className="font-semibold text-sm">{album.title}</h3>
                      <p className="text-xs text-zinc-500">
                        {album.releaseDate ? new Date(album.releaseDate).getFullYear() : ''}
                        {album.releaseDate ? ' · ' : ''}
                        {album.songs.length} {dict.artist.songs.toLowerCase()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Deep Cuts */}
          {deepCuts.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">{dict.artist.deepCuts}</h2>
              <ul className="space-y-2">
                {deepCuts.map((song) => (
                  <li key={song.id} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg">
                    <span className="text-zinc-400" aria-hidden="true">♫</span>
                    <span className="font-medium text-sm">{song.title}</span>
                    {song.duration && <span className="text-xs text-zinc-500 ml-auto">{song.duration}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Articles */}
          {artist.articles.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">{dict.artist.articles}</h2>
              {artist.articles.map((article) => (
                <Link key={article.id} href={`/${locale}/article/${article.slug}`}
                  className="block p-4 bg-zinc-900 rounded-xl mb-3 hover:shadow-md transition-shadow">
                  <h3 className="font-bold">{locale === 'tr' ? article.titleTr : article.titleEn}</h3>
                  <p className="text-sm text-zinc-500">{article.author.name}</p>
                </Link>
              ))}
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside>
          {artist.image ? (
            <img src={artist.image} alt={artist.name} className="w-full rounded-xl mb-6" />
          ) : (
            <div className="w-full h-64 bg-zinc-800 rounded-xl flex items-center justify-center text-6xl text-zinc-400 mb-6" aria-hidden="true">♪</div>
          )}

          {artist.architects.length > 0 && (
            <div>
              <h2 className="font-bold text-lg mb-3">{dict.artist.connectedArchitects}</h2>
              <ul className="space-y-2">
                {artist.architects.map(({ architect }) => (
                  <li key={architect.id}>
                    <Link href={`/${locale}/architects/${architect.slug}`}
                      className="text-sm text-zinc-400 hover:text-white">
                      {architect.name} <span className="text-zinc-400">({architect.type.replace('_', ' ')})</span>
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
