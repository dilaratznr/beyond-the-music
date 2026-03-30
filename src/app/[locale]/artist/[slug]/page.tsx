export const revalidate = 30;

import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ArtistDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;

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

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen pt-20">
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="text-sm text-zinc-500 mb-4">
        <Link href={`/${locale}/artist`} className="hover:text-white">Artist</Link>
        <span className="mx-1">/</span>
        <span className="text-white font-medium">{artist.name}</span>
      </div>

      <div className="grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{artist.name}</h1>
          <div className="flex gap-2 mb-6">
            <span className="px-3 py-1 bg-zinc-800 rounded-full text-sm">{artist.type}</span>
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
              <h2 className="text-2xl font-bold mb-4">Albums</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {artist.albums.map((album) => (
                  <div key={album.id} className="bg-zinc-900 rounded-xl overflow-hidden ">
                    {album.coverImage ? (
                      <img src={album.coverImage} alt={album.title} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-zinc-800 flex items-center justify-center text-3xl">◉</div>
                    )}
                    <div className="p-3">
                      <h3 className="font-semibold text-sm">{album.title}</h3>
                      <p className="text-xs text-zinc-500">{album.releaseDate ? new Date(album.releaseDate).getFullYear() : ''} · {album.songs.length} songs</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Deep Cuts */}
          {deepCuts.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Deep Cuts</h2>
              <ul className="space-y-2">
                {deepCuts.map((song) => (
                  <li key={song.id} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg">
                    <span className="text-zinc-400">♫</span>
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
              <h2 className="text-2xl font-bold mb-4">Articles</h2>
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
        <div>
          {artist.image ? (
            <img src={artist.image} alt={artist.name} className="w-full rounded-xl mb-6" />
          ) : (
            <div className="w-full h-64 bg-zinc-800 rounded-xl flex items-center justify-center text-6xl text-zinc-400 mb-6">♪</div>
          )}

          {artist.architects.length > 0 && (
            <div>
              <h3 className="font-bold text-lg mb-3">Connected Architects</h3>
              <ul className="space-y-2">
                {artist.architects.map(({ architect, role }) => (
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
        </div>
      </div>
    </div>
    </div>
  );
}
