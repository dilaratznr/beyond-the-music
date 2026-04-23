export const revalidate = 30;

import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isSectionEnabled } from '@/lib/site-sections';
import PageHero from '@/components/public/PageHero';
import CardImage from '@/components/public/CardImage';

// Her türe farklı bir gradient paleti — görsel yüklenemezse kartların
// birbirinden ayırt edilebilmesi için. Tur slug'ının bir hash'iyle
// index'leniyor, seed-stable (aynı tür hep aynı gradient).
const GRADIENTS = [
  'from-zinc-800 to-zinc-950',
  'from-emerald-900/60 to-zinc-950',
  'from-rose-900/50 to-zinc-950',
  'from-indigo-900/55 to-zinc-950',
  'from-amber-900/50 to-zinc-950',
  'from-cyan-900/55 to-zinc-950',
  'from-purple-900/55 to-zinc-950',
  'from-orange-900/50 to-zinc-950',
];
function pickGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

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
          {genres.map((g) => {
            const name = tr ? g.nameTr : g.nameEn;
            return (
              <Link key={g.id} href={`/${locale}/genre/${g.slug}`}
                className="group relative block rounded-xl overflow-hidden aspect-[3/4] bg-zinc-900 hover-lift">
                <CardImage src={g.image} letter={name.charAt(0)} gradientClass={pickGradient(g.slug)} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                  <h3 className="text-white font-bold text-xs">{name}</h3>
                  <p className="text-white/40 text-[9px] mt-0.5">{g._count.artists} {tr ? 'sanatçı' : 'artists'} · {g.children.length} {tr ? 'alt tür' : 'sub'}</p>
                </div>
              </Link>
            );
          })}
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
