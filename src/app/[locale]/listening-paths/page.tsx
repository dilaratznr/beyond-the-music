export const revalidate = 30;

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import { isSectionEnabled } from '@/lib/site-sections';
import PageHero from '@/components/public/PageHero';
import EmptyState from '@/components/public/EmptyState';
import CardImage from '@/components/public/CardImage';

const PATH_PALETTES = [
  'from-emerald-900/55 to-zinc-950', 'from-rose-900/55 to-zinc-950',
  'from-indigo-900/60 to-zinc-950', 'from-amber-900/50 to-zinc-950',
  'from-cyan-900/55 to-zinc-950', 'from-purple-900/55 to-zinc-950',
];
function pathGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PATH_PALETTES[h % PATH_PALETTES.length];
}

export default async function ListeningPathsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await isSectionEnabled('listeningPaths'))) notFound();
  const dict = getDictionary(locale);
  const tr = locale === 'tr';

  const paths = await prisma.listeningPath.findMany({
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const typeLabels: Record<string, string> = {
    EMOTION: dict.listeningPaths.emotion, ERA: dict.listeningPaths.era,
    CITY: dict.listeningPaths.city, CONTRAST: dict.listeningPaths.contrast,
    INTRO: dict.listeningPaths.intro, DEEP: dict.listeningPaths.deep,
  };

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen">
      <PageHero
        eyebrow={tr ? 'Küratöryel Yolculuklar' : 'Curated Journeys'}
        title={dict.listeningPaths.title}
        subtitle={dict.listeningPaths.description}
        meta={
          <div className="flex flex-wrap gap-2">
            {Object.entries(typeLabels).map(([key, label]) => (
              <span
                key={key}
                className="px-3 py-1 bg-white/[0.04] border border-white/10 rounded-full text-[11px] font-semibold text-zinc-300 uppercase tracking-wider"
              >
                {label}
              </span>
            ))}
          </div>
        }
      />

      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 py-12 md:py-16">
        {paths.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paths.map((p) => {
              const title = tr ? p.titleTr : p.titleEn;
              const n = p._count.items;
              // "Durak" belirsizdi (0 DURAK gibi gözüküyordu). n=0
              // ise "Henüz parça yok" yazıyor, n>0 ise "N parça".
              const countLabel =
                n === 0
                  ? tr ? 'Henüz parça yok' : 'No tracks yet'
                  : `${n} ${tr ? 'parça' : 'tracks'}`;
              return (
                <Link
                  key={p.id}
                  href={`/${locale}/listening-paths/${p.slug}`}
                  className="group relative rounded-xl overflow-hidden aspect-[4/5] bg-zinc-900 hover-lift block"
                >
                  <CardImage
                    src={p.image}
                    letter={title.charAt(0)}
                    gradientClass={pathGradient(p.slug)}
                    imgClassName="opacity-50 group-hover:opacity-70 transition-opacity duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                    <span className="inline-block px-2.5 py-0.5 bg-white/[0.08] border border-white/15 text-white text-[10px] font-bold uppercase tracking-widest rounded-full mb-2">
                      {typeLabels[p.type] || p.type}
                    </span>
                    <h3 className="font-editorial text-xl font-semibold text-white tracking-[-0.01em]">
                      {title}
                    </h3>
                    <p className="text-white/50 text-xs mt-2 leading-relaxed line-clamp-2">
                      {tr ? p.descriptionTr : p.descriptionEn}
                    </p>
                    <p className={`text-[10px] uppercase tracking-widest mt-3 font-semibold ${n === 0 ? 'text-zinc-600 italic normal-case tracking-normal' : 'text-zinc-400'}`}>
                      {countLabel}{n > 0 ? ' →' : ''}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={tr ? 'Henüz dinleme rotası yok.' : 'No listening paths yet.'}
            hint={tr ? 'Küratöryel yolculuklar — yakında' : 'Curated journeys — soon'}
          />
        )}
      </div>
    </div>
  );
}
