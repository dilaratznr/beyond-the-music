export const revalidate = 30;

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { isAdminRequest } from '@/lib/auth-guard';

/**
 * Prerender every album at build time so <Link> prefetch carries the full
 * RSC payload. New albums fall back to on-demand ISR.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const albums: Array<{ slug: string }> = await prisma.album.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true },
  });
  return albums.map(({ slug }) => ({ slug }));
}
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/i18n';
import { buildPageMetadata, stripHtml, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import AlbumTrackList from '@/components/public/AlbumTrackList';
import PreviewBanner from '@/components/public/PreviewBanner';

type Params = Promise<{ locale: string; slug: string }>;
type SearchParams = Promise<{ preview?: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const isPreviewRequested = sp?.preview === '1';
  const isAdminPreview = isPreviewRequested && (await isAdminRequest());

  // Preview modda DRAFT/PENDING album'ü de okumak için status filtresini
  // gevşet; aksi halde yine sadece PUBLISHED.
  const album = await prisma.album.findFirst({
    where: isAdminPreview ? { slug } : { slug, status: 'PUBLISHED' },
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
    noIndex: isPreviewRequested,
  });
}

export default async function AlbumDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const isPreviewRequested = sp?.preview === '1';
  const isAdminPreview = isPreviewRequested && (await isAdminRequest());
  const dict = getDictionary(locale);
  const tr = locale === 'tr';

  const album = await prisma.album.findFirst({
    where: isAdminPreview ? { slug } : { slug, status: 'PUBLISHED' },
    include: {
      artist: true,
      songs: { orderBy: [{ trackNumber: 'asc' }, { id: 'asc' }] },
    },
  });

  if (!album) notFound();
  // Album bulundu ama yayında değil + admin preview yok → 404
  if (album.status !== 'PUBLISHED' && !isAdminPreview) notFound();

  const isPreviewMode = isAdminPreview && album.status !== 'PUBLISHED';

  const description = tr ? album.descriptionTr : album.descriptionEn;
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
    <div className="bg-[#0a0a0b] text-white">
      <JsonLd data={jsonLd} />

      {isPreviewMode && (
        <PreviewBanner
          status={album.status}
          publishedAt={album.releaseDate}
          editHref={`/admin/albums/${album.id}`}
          locale={locale}
        />
      )}

      {/* ▸▸▸ HERO — kapak sağ/sol tam-genişlik bokeh + sol altta editoryel
          meta. Görsel bol-renk olduğundan gradient ağırlığını koyu tutmak
          lazım. Albüm sayfaları aslında "kapakla aynı renk paleti"
          hissini benimser; arka plana kapağı çok hafif + blurred olarak
          kopyalıyoruz, sonra gradient üstüne editoryel başlık. */}
      <section className="relative w-full min-h-[60vh] md:min-h-[72vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          {album.coverImage ? (
            <>
              <img
                src={album.coverImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-45"
              />
              <div className="absolute inset-0 bg-[#0a0a0b]/30" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-[#0a0a0b]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_55%)]" />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-black/55 to-black/30" />
        </div>

        <div className="relative z-10 w-full max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 pb-12 md:pb-16 pt-32">
          <nav
            aria-label="Breadcrumb"
            className="text-[11px] md:text-[12px] tracking-[0.3em] uppercase font-bold text-zinc-300 mb-7 flex items-center gap-3 flex-wrap"
          >
            <span className="w-10 h-px bg-zinc-500" />
            <Link
              href={`/${locale}/artist/${album.artist.slug}`}
              className="text-zinc-400 hover:text-white underline-grow pb-1"
            >
              {album.artist.name}
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-white" aria-current="page">
              {dict.artist.albums}
            </span>
          </nav>

          <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-end">
            <div className="md:col-span-4 lg:col-span-3">
              {album.coverImage ? (
                <img
                  src={album.coverImage}
                  alt={album.title}
                  className="w-full max-w-xs md:max-w-none aspect-square object-cover rounded-xl shadow-2xl ring-1 ring-white/10"
                />
              ) : (
                <div
                  className="w-full max-w-xs md:max-w-none aspect-square bg-gradient-to-br from-zinc-800 to-zinc-950 rounded-xl flex items-center justify-center font-editorial font-black text-white/10 text-7xl"
                  aria-hidden="true"
                >
                  {album.title.charAt(0)}
                </div>
              )}
            </div>

            <div className="md:col-span-8 lg:col-span-9">
              <h1
                className="font-editorial leading-[0.95] tracking-[-0.025em] max-w-4xl"
                style={{ fontSize: 'clamp(2.25rem, 5.5vw, 5rem)', fontWeight: 700 }}
              >
                {album.title}
              </h1>

              <div className="mt-6 flex items-center gap-5 flex-wrap text-[13px] text-zinc-400 font-medium">
                <Link
                  href={`/${locale}/artist/${album.artist.slug}`}
                  className="text-white hover:underline underline-offset-4"
                >
                  {album.artist.name}
                </Link>
                {year && (
                  <>
                    <span className="w-8 h-px bg-zinc-600" aria-hidden="true" />
                    <span>{year}</span>
                  </>
                )}
                {album.songs.length > 0 && (
                  <>
                    <span className="w-8 h-px bg-zinc-600" aria-hidden="true" />
                    <span>
                      {album.songs.length} {dict.artist.songs.toLowerCase()}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ▸▸▸ BODY — sol: açıklama + track list. Sağ: bilgi kutusu. */}
      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 py-16 md:py-24 grid lg:grid-cols-12 gap-12 lg:gap-16">
        <div className="lg:col-span-8 space-y-16">
          {description && (
            <section>
              <p className="text-zinc-500 text-[11px] tracking-[0.3em] uppercase font-bold mb-4">
                {tr ? 'Hakkında' : 'About'}
              </p>
              <div className="article-body max-w-none whitespace-pre-line">
                {description}
              </div>
            </section>
          )}

          {album.songs.length > 0 && (
            <section aria-labelledby="album-tracks">
              <p id="album-tracks" className="text-zinc-500 text-[11px] tracking-[0.3em] uppercase font-bold mb-6">
                {dict.artist.songs}
              </p>
              <AlbumTrackList
                songs={album.songs.map((s) => ({
                  id: s.id,
                  title: s.title,
                  trackNumber: s.trackNumber,
                  duration: s.duration,
                  isDeepCut: s.isDeepCut,
                  spotifyUrl: s.spotifyUrl,
                  youtubeUrl: s.youtubeUrl,
                  descriptionTr: s.descriptionTr,
                  descriptionEn: s.descriptionEn,
                }))}
                locale={locale}
                labels={{
                  deepCut: dict.artist.deepCuts,
                  expand: tr ? 'Aç' : 'Open',
                  collapse: tr ? 'Kapat' : 'Close',
                  about: dict.song?.about ?? (tr ? 'Şarkı Hakkında' : 'About this song'),
                  listenOnSpotify: dict.song?.listenOnSpotify ?? 'Spotify',
                  listenOnYouTube: dict.song?.listenOnYouTube ?? 'YouTube',
                }}
              />
            </section>
          )}
        </div>

        <aside className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start space-y-6">
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
            <p className="text-zinc-500 text-[11px] tracking-[0.3em] uppercase font-bold mb-3">
              {tr ? 'Albüm' : 'Album'}
            </p>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-zinc-500">{tr ? 'Sanatçı' : 'Artist'}</dt>
                <dd>
                  <Link
                    href={`/${locale}/artist/${album.artist.slug}`}
                    className="text-white font-medium hover:underline underline-offset-4"
                  >
                    {album.artist.name}
                  </Link>
                </dd>
              </div>
              {year && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-zinc-500">{tr ? 'Yıl' : 'Year'}</dt>
                  <dd className="text-white font-medium">{year}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-zinc-500">{tr ? 'Parça' : 'Tracks'}</dt>
                <dd className="text-white font-medium">{album.songs.length}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
