export const revalidate = 30;

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';

/**
 * Prerender every known artist at build time so <Link> prefetch can pull
 * the full RSC payload for instant clicks. New artists added later fall
 * back to on-demand ISR.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const artists: Array<{ slug: string }> = await prisma.artist.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true },
  });
  return artists.map(({ slug }) => ({ slug }));
}
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
  const artist = await prisma.artist.findFirst({
    where: { slug, status: 'PUBLISHED' },
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
  const tr = locale === 'tr';

  const artist = await prisma.artist.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      genres: { where: { genre: { status: 'PUBLISHED' } }, include: { genre: true } },
      albums: { where: { status: 'PUBLISHED' }, include: { songs: true }, orderBy: { releaseDate: 'desc' } },
      articles: { where: { status: 'PUBLISHED' }, include: { author: { select: { name: true } } }, orderBy: { publishedAt: 'desc' } },
      architects: { where: { architect: { status: 'PUBLISHED' } }, include: { architect: true } },
    },
  });

  if (!artist) notFound();

  const bio = tr ? artist.bioTr : artist.bioEn;
  const deepCuts = artist.albums.flatMap((a) => a.songs.filter((s) => s.isDeepCut));
  const typeLabel =
    artist.type === 'SOLO'
      ? dict.artist.solo
      : artist.type === 'GROUP'
        ? dict.artist.group
        : dict.artist.composer;

  const lifeRange = [
    artist.birthDate ? new Date(artist.birthDate).getFullYear() : null,
    artist.deathDate ? new Date(artist.deathDate).getFullYear() : null,
  ];
  const lifeLabel = lifeRange[0]
    ? lifeRange[1]
      ? `${lifeRange[0]}–${lifeRange[1]}`
      : `${lifeRange[0]}–`
    : null;

  const schemaType = artist.type === 'GROUP' ? 'MusicGroup' : 'Person';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: artist.name,
    description: stripHtml(bio),
    image: artist.image || undefined,
    url: `${SITE_URL}/${locale}/artist/${slug}`,
    genre: artist.genres.map(({ genre }) => (tr ? genre.nameTr : genre.nameEn)),
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
    <div className="bg-[#0a0a0b] text-white">
      <JsonLd data={jsonLd} />

      {/* ▸▸▸ HERO — portre görseli sağ tarafta, isim + meta solda.
          Hero'nun sol yarısı bioa hazırlık: ad, eyebrow, türler, yıllar.
          Sağ yarısı büyük dikey portre. Dergi kapak portresi hissi. */}
      <section className="relative w-full min-h-[65vh] md:min-h-[80vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          {artist.image ? (
            <>
              <img src={artist.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-55" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b] via-black/60 to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-[#0a0a0b]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.08),transparent_55%)]" />
              <span
                className="absolute top-10 right-10 font-editorial font-black text-white/5 leading-none select-none"
                style={{ fontSize: 'clamp(8rem, 20vw, 20rem)' }}
                aria-hidden="true"
              >
                {artist.name.charAt(0)}
              </span>
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-black/40 to-black/10" />
        </div>

        <div className="relative z-10 w-full max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 pb-14 md:pb-20 pt-32">
          <nav aria-label="Breadcrumb" className="text-[11px] md:text-[12px] tracking-[0.3em] uppercase font-bold text-zinc-300 mb-7 flex items-center gap-3 flex-wrap">
            <span className="w-10 h-px bg-zinc-500" />
            <Link href={`/${locale}/artist`} className="text-zinc-400 hover:text-white underline-grow pb-1">{dict.nav.artist}</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-white" aria-current="page">{artist.name}</span>
          </nav>

          <h1
            className="font-editorial leading-[0.95] tracking-[-0.025em] max-w-5xl"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 5.5rem)', fontWeight: 700 }}
          >
            {artist.name}
          </h1>

          <div className="mt-8 flex items-center gap-5 flex-wrap text-[13px] text-zinc-400 font-medium">
            <span className="px-3 py-1 bg-white/[0.06] border border-white/10 rounded-full text-[11px] font-bold uppercase tracking-widest text-white">
              {typeLabel}
            </span>
            {lifeLabel && (
              <>
                <span className="w-8 h-px bg-zinc-600" aria-hidden="true" />
                <span>{lifeLabel}</span>
              </>
            )}
            {artist.genres.length > 0 && (
              <>
                <span className="w-8 h-px bg-zinc-600" aria-hidden="true" />
                <span className="flex items-center gap-2 flex-wrap">
                  {artist.genres.map(({ genre }, i) => (
                    <span key={genre.id} className="flex items-center gap-2">
                      <Link
                        href={`/${locale}/genre/${genre.slug}`}
                        className="text-zinc-300 hover:text-white underline-grow pb-0.5"
                      >
                        {tr ? genre.nameTr : genre.nameEn}
                      </Link>
                      {i < artist.genres.length - 1 && <span className="text-zinc-600">·</span>}
                    </span>
                  ))}
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ▸▸▸ BODY — iki kolon: solda uzun-form bio + diskografi +
          makaleler; sağda mimarlar listesi. */}
      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 py-16 md:py-24 grid lg:grid-cols-12 gap-12 lg:gap-16">
        <div className="lg:col-span-8 space-y-16">
          {bio && (
            <section>
              <p className="text-zinc-500 text-[11px] tracking-[0.3em] uppercase font-bold mb-4">
                {tr ? 'Biyografi' : 'Biography'}
              </p>
              <div className="article-body max-w-none whitespace-pre-line">
                {bio}
              </div>
            </section>
          )}

          {artist.albums.length > 0 && (
            <section>
              <p className="text-zinc-500 text-[11px] tracking-[0.3em] uppercase font-bold mb-6">
                {dict.artist.albums}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {artist.albums.map((album) => (
                  <Link
                    key={album.id}
                    href={`/${locale}/album/${album.slug}`}
                    className="group"
                  >
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-zinc-900 mb-3 card-shine">
                      {album.coverImage ? (
                        <img
                          src={album.coverImage}
                          alt={album.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
                          <span className="font-editorial font-black text-white/15 text-5xl">
                            {album.title.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-editorial font-semibold text-sm md:text-base leading-tight group-hover:underline decoration-1 underline-offset-4">
                      {album.title}
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-widest">
                      {album.releaseDate ? new Date(album.releaseDate).getFullYear() : ''}
                      {album.releaseDate && album.songs.length > 0 ? ' · ' : ''}
                      {album.songs.length > 0 && `${album.songs.length} ${dict.artist.songs.toLowerCase()}`}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {deepCuts.length > 0 && (
            <section>
              <p className="text-zinc-500 text-[11px] tracking-[0.3em] uppercase font-bold mb-6">
                {dict.artist.deepCuts}
              </p>
              <ol className="space-y-0 border-t border-white/10">
                {deepCuts.map((song, i) => (
                  <li
                    key={song.id}
                    className="flex items-center gap-5 py-4 border-b border-white/10 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-[11px] text-zinc-600 font-mono w-6 flex-shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 min-w-0 text-sm text-zinc-200 truncate">{song.title}</span>
                    {song.duration && (
                      <span className="text-xs text-zinc-500 font-mono flex-shrink-0">{song.duration}</span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {artist.articles.length > 0 && (
            <section>
              <p className="text-zinc-500 text-[11px] tracking-[0.3em] uppercase font-bold mb-6">
                {dict.artist.articles}
              </p>
              <div className="border-t border-white/10">
                {artist.articles.map((article) => {
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
                      <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 relative overflow-hidden rounded-lg bg-zinc-900">
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
                        <h3 className="font-editorial text-base md:text-xl font-bold leading-tight tracking-[-0.01em] group-hover:underline decoration-1 underline-offset-4">
                          {title}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-2 flex items-center gap-3">
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
          )}
        </div>

        <aside className="lg:col-span-4 space-y-12 lg:sticky lg:top-24 lg:self-start">
          {artist.architects.length > 0 && (
            <div>
              <p className="text-zinc-500 text-[11px] tracking-[0.3em] uppercase font-bold mb-4">
                {dict.artist.connectedArchitects}
              </p>
              <ul className="space-y-3">
                {artist.architects.map(({ architect }) => (
                  <li key={architect.id}>
                    <Link
                      href={`/${locale}/architects/${architect.slug}`}
                      className="group block py-2 border-b border-white/5"
                    >
                      <span className="text-sm text-zinc-200 group-hover:text-white font-medium">
                        {architect.name}
                      </span>
                      <span className="block text-[10px] uppercase tracking-[0.25em] text-zinc-500 mt-1">
                        {architect.type.replace('_', ' ')}
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
