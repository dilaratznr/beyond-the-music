export const revalidate = 30;

import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isSectionEnabled } from '@/lib/site-sections';
import PageHero from '@/components/public/PageHero';

export default async function GenrePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await isSectionEnabled('genre'))) notFound();
  const dict = getDictionary(locale);
  const tr = locale === 'tr';

  const genres = await prisma.genre.findMany({
    where: { parentId: null },
    include: { children: { orderBy: { nameTr: 'asc' } }, _count: { select: { artists: true } } },
    orderBy: { order: 'asc' },
  });

  const allSubgenres = genres.flatMap((g) => g.children);

  return (
    <div className="bg-[#0a0a0b] text-white">
      <PageHero
        eyebrow={tr ? 'Keşfet' : 'Explore'}
        title={dict.genre.title}
        subtitle={tr ? 'Ritimden kültüre, sesten hikayeye.' : 'From rhythm to culture, sound to story.'}
        meta={
          <>
            <span>{genres.length} {tr ? 'ana tür' : 'main genres'}</span>
            {allSubgenres.length > 0 && (
              <>
                <span className="w-8 h-px bg-zinc-600" aria-hidden="true" />
                <span>{allSubgenres.length} {tr ? 'alt tür' : 'subgenres'}</span>
              </>
            )}
          </>
        }
      />

      {/* Genre Grid */}
      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 py-12">
        <div className="gsap-stagger grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {genres.map((g) => (
            <Link key={g.id} href={`/${locale}/genre/${g.slug}`}
              className="group relative block rounded-xl overflow-hidden aspect-[3/4] bg-zinc-800 img-zoom hover-lift">
              {g.image ? (
                <img src={g.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-4xl text-white/10">♫</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="text-white font-bold text-xs">{locale === 'tr' ? g.nameTr : g.nameEn}</h3>
                <p className="text-white/40 text-[9px] mt-0.5">{g._count.artists} {locale === 'tr' ? 'sanatçı' : 'artists'} · {g.children.length} {locale === 'tr' ? 'alt tür' : 'sub'}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Subgenres */}
        {allSubgenres.length > 0 && (
          <div className="mt-16">
            <h2 className="text-lg font-bold mb-6">{dict.genre.subgenre}</h2>
            <div className="flex flex-wrap gap-2">
              {allSubgenres.map((sub) => (
                <Link key={sub.id} href={`/${locale}/genre/${sub.slug}`}
                  className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-xs text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                  {locale === 'tr' ? sub.nameTr : sub.nameEn}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
