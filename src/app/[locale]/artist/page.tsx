export const revalidate = 30;

import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function ArtistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  const artists = await prisma.artist.findMany({
    include: { genres: { include: { genre: true } }, _count: { select: { albums: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="bg-[var(--bg)] text-[var(--text)] min-h-screen pt-16">
      {/* Header */}
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <p className="text-zinc-600 text-[10px] tracking-[0.3em] uppercase mb-3">02</p>
        <h1 className="font-display font-black" style={{ fontSize: 'var(--display-sm)' }}>{dict.artist.title}</h1>
        <p className="text-zinc-500 text-sm mt-2">{artists.length} {locale === 'tr' ? 'sanatçı' : 'artists'}</p>
      </div>

      {/* Bento grid */}
      <div className="max-w-[1600px] mx-auto px-6 pb-20">
        <div className="gsap-stagger grid grid-cols-12 gap-3 auto-rows-[180px]">
          {artists.map((a, i) => {
            const layouts = [
              'col-span-6 md:col-span-5 row-span-2',
              'col-span-6 md:col-span-3 row-span-1',
              'col-span-6 md:col-span-4 row-span-2',
              'col-span-6 md:col-span-3 row-span-1',
              'col-span-6 md:col-span-4 row-span-1',
              'col-span-6 md:col-span-5 row-span-2',
              'col-span-6 md:col-span-3 row-span-2',
              'col-span-12 md:col-span-4 row-span-1',
              'col-span-6 md:col-span-5 row-span-2',
              'col-span-6 md:col-span-3 row-span-1',
            ];
            return (
              <Link key={a.id} href={`/${locale}/artist/${a.slug}`}
                className={`${layouts[i % layouts.length]} group relative rounded-lg overflow-hidden img-zoom hover-lift`}>
                {a.image ? <img src={a.image} alt={a.name} className="absolute inset-0 w-full h-full object-cover" />
                  : <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center text-zinc-800 text-5xl">♪</div>}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-bold text-sm">{a.name}</h3>
                  <p className="text-white/30 text-[9px] mt-0.5">{a.genres.map((g) => locale === 'tr' ? g.genre.nameTr : g.genre.nameEn).join(' · ')}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
