export const revalidate = 30;

import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function GenrePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  const genres = await prisma.genre.findMany({
    where: { parentId: null },
    include: { children: { orderBy: { nameTr: 'asc' } }, _count: { select: { artists: true } } },
    orderBy: { order: 'asc' },
  });
  const subs = genres.flatMap((g) => g.children);

  return (
    <div className="bg-[var(--bg)] text-[var(--text)] min-h-screen pt-16">
      {/* Header */}
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <p className="text-zinc-600 text-[10px] tracking-[0.3em] uppercase mb-3">01</p>
        <h1 className="font-display font-black" style={{ fontSize: 'var(--display-sm)' }}>{dict.genre.title}</h1>
      </div>

      {/* Bento grid - mixed sizes */}
      <div className="max-w-[1600px] mx-auto px-6 pb-20">
        <div className="gsap-stagger grid grid-cols-12 gap-3 auto-rows-[200px]">
          {genres.map((g, i) => {
            const layouts = [
              'col-span-6 md:col-span-5 row-span-2',
              'col-span-6 md:col-span-3 row-span-1',
              'col-span-6 md:col-span-4 row-span-2',
              'col-span-6 md:col-span-4 row-span-1',
              'col-span-6 md:col-span-3 row-span-2',
              'col-span-6 md:col-span-5 row-span-1',
              'col-span-6 md:col-span-4 row-span-2',
              'col-span-6 md:col-span-3 row-span-1',
              'col-span-6 md:col-span-5 row-span-2',
              'col-span-6 md:col-span-4 row-span-1',
              'col-span-6 md:col-span-3 row-span-2',
              'col-span-6 md:col-span-5 row-span-1',
              'col-span-6 md:col-span-4 row-span-2',
              'col-span-6 md:col-span-3 row-span-1',
              'col-span-6 md:col-span-5 row-span-2',
              'col-span-6 md:col-span-4 row-span-1',
            ];
            return (
              <Link key={g.id} href={`/${locale}/genre/${g.slug}`}
                className={`${layouts[i % layouts.length]} group relative rounded-lg overflow-hidden img-zoom hover-lift`}>
                {g.image ? <img src={g.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  : <div className="absolute inset-0 bg-zinc-900" />}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/15 transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-bold text-sm">{locale === 'tr' ? g.nameTr : g.nameEn}</h3>
                  <p className="text-white/30 text-[9px] mt-0.5">{g._count.artists} {locale === 'tr' ? 'sanatçı' : 'artists'}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Subgenres as outline text */}
        {subs.length > 0 && (
          <div className="mt-20 border-t border-white/5 pt-12">
            <p className="text-zinc-600 text-[10px] tracking-[0.3em] uppercase mb-6">{dict.genre.subgenre}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {subs.map((s) => (
                <Link key={s.id} href={`/${locale}/genre/${s.slug}`}
                  className="text-outline font-display font-bold text-lg hover:text-white transition-all"
                  style={{ WebkitTextStroke: '0.8px rgba(255,255,255,0.2)', color: 'transparent' }}>
                  {locale === 'tr' ? s.nameTr : s.nameEn}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
