export const revalidate = 30;

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';

/**
 * Prerender every album at build time so <Link> prefetch carries the full
 * RSC payload. New albums fall back to on-demand ISR.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const albums: Array<{ slug: string }> = await prisma.album.findMany({
    select: { slug: true },
  });
  return albums.map(({ slug }) => ({ slug }));
}
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/i18n';
import { buildPageMetadata, stripHtml, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const album = await prisma.album.findUnique({
    where: { slug },
    select: {
      title: true,
      descriptionTr: true,
      descriptionEn: true,
      coverImage: true,
      releaseDate: true,
      artist: { select: { name: true } },
    },
  });
  if (!album) {
    return { title: locale === 'tr' ? 'Albüm bulunamadı' : 'Album not found' };
  }
  const description = stripHtml(
    locale === 'tr' ? album.descriptionTr : album.descriptionEn,
  );
  return buildPageMetadata({
    title: `${album.title} — ${album.artist.name}`,
    description: description || `${album.artist.name}`,
    locale,
    path: `/album/${slug}`,
    image: album.coverImage,
    type: 'article',
    publishedTime: album.releaseDate,
  });
}

export default async function AlbumDetailPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  const dict = getDictionary(locale);

  const album = await prisma.album.findUnique({
    where: { slug },
    include: {
      artist: true,
      songs: { orderBy: [{ trackNumber: 'asc' }, { id: 'asc' }] },
    },
  });

  if (!album) notFound();

  const description = locale === 'tr' ? album.descriptionTr : album.descriptionEn;
  const year = album.releaseDate ? new Date(album.releaseDate).getFullYear() : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicAlbum',
    name: album.title,
    url: `${SITE_URL}/${locale}/album/${slug}`,
    image: album.coverImage || undefined,
    datePublished: album.releaseDate?.toISOString(),
    description: stripHtml(description),
    byArtist: {
      '@type': 'MusicGroup',
      name: album.artist.name,
      url: `${SITE_URL}/${locale}/artist/${album.artist.slug}`,
    },
    numTracks: album.songs.length,
    ...(album.songs.length > 0
      ? {
          track: album.songs.map((s, i) => ({
            '@type': 'MusicRecording',
            name: s.title,
            position: s.trackNumber ?? i + 1,
            duration: s.duration || undefined,
          })),
        }
      : {}),
  };

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen pt-20">
      <JsonLd data={jsonLd} />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <nav aria-label="Breadcrumb" className="text-sm text-zinc-500 mb-6">
          <Link href={`/${locale}/artist`} className="hover:text-white">
            {dict.nav.artist}
          </Link>
          <span className="mx-1">/</span>
          <Link
            href={`/${locale}/artist/${album.artist.slug}`}
            className="hover:text-white"
          >
            {album.artist.name}
          </Link>
          <span className="mx-1">/</span>
          <span className="text-white font-medium" aria-current="page">
            {album.title}
          </span>
        </nav>

        <div className="grid md:grid-cols-3 gap-10 mb-12">
          <div className="md:col-span-1">
            {album.coverImage ? (
              <img
                src={album.coverImage}
                alt={album.title}
                className="w-full rounded-xl shadow-lg"
              />
            ) : (
              <div
                className="w-full aspect-square bg-zinc-800 rounded-xl flex items-center justify-center text-6xl text-zinc-600"
                aria-hidden="true"
              >
                ◉
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-widest text-emerald-500/60 mb-2">
              {dict.artist.albums}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              {album.title}
            </h1>
            <p className="text-zinc-400 mb-4">
              <Link
                href={`/${locale}/artist/${album.artist.slug}`}
                className="hover:text-white"
              >
                {album.artist.name}
              </Link>
              {year && (
                <>
                  {' · '}
                  <span>{year}</span>
                </>
              )}
              {album.songs.length > 0 && (
                <>
                  {' · '}
                  <span>
                    {album.songs.length} {dict.artist.songs.toLowerCase()}
                  </span>
                </>
              )}
            </p>
            {description && (
              <p className="text-zinc-300 leading-relaxed whitespace-pre-line">
                {description}
              </p>
            )}
          </div>
        </div>

        {album.songs.length > 0 && (
          <section aria-labelledby="album-tracks">
            <h2 id="album-tracks" className="text-xl font-bold mb-4">
              {dict.artist.songs}
            </h2>
            <ol className="divide-y divide-white/5 bg-zinc-900/60 rounded-xl overflow-hidden">
              {album.songs.map((song, idx) => (
                <li
                  key={song.id}
                  className="flex items-center gap-4 p-4 hover:bg-zinc-900 transition-colors"
                >
                  <span className="text-zinc-500 text-sm w-8 text-right tabular-nums">
                    {song.trackNumber ?? idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{song.title}</p>
                    {song.isDeepCut && (
                      <span className="text-[10px] uppercase tracking-widest text-emerald-500/70">
                        {dict.artist.deepCuts}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs">
                    {song.spotifyUrl && (
                      <a
                        href={song.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline"
                      >
                        Spotify
                      </a>
                    )}
                    {song.youtubeUrl && (
                      <a
                        href={song.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-rose-400 hover:underline"
                      >
                        YouTube
                      </a>
                    )}
                    {song.duration && (
                      <span className="text-zinc-500 tabular-nums">
                        {song.duration}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
