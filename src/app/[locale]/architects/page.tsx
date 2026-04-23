export const revalidate = 30;

import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isSectionEnabled } from '@/lib/site-sections';
import EmptyState from '@/components/public/EmptyState';
import PageHero from '@/components/public/PageHero';
import CardImage from '@/components/public/CardImage';

const CARD_PALETTES = [
  'from-zinc-800 to-zinc-950', 'from-rose-900/55 to-zinc-950', 'from-emerald-900/55 to-zinc-950',
  'from-indigo-900/60 to-zinc-950', 'from-amber-900/50 to-zinc-950', 'from-cyan-900/55 to-zinc-950',
  'from-purple-900/55 to-zinc-950', 'from-orange-900/55 to-zinc-950',
];
function cardGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CARD_PALETTES[h % CARD_PALETTES.length];
}

export default async function ArchitectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await isSectionEnabled('architects'))) notFound();
  const dict = getDictionary(locale);

  const architects = await prisma.architect.findMany({
    include: { _count: { select: { artists: true } } },
    orderBy: { name: 'asc' },
  });

  const types = ['PRODUCER', 'STUDIO', 'MANAGER', 'ARRANGER', 'RECORD_LABEL'] as const;
  const labels: Record<string, string> = {
    PRODUCER: dict.architects.producer, STUDIO: dict.architects.studio,
    MANAGER: dict.architects.manager, ARRANGER: dict.architects.arrangers,
    RECORD_LABEL: dict.architects.recordLabels,
  };

  const tr = locale === 'tr';

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen">
      <PageHero
        eyebrow={tr ? 'Yapı' : 'Structure'}
        title={dict.architects.title}
        subtitle={tr ? 'Sahne önünde olmayan isimler — prodüktörler, stüdyolar, etiketler.' : 'Names not in the spotlight — producers, studios, labels.'}
        meta={
          <div className="flex flex-wrap gap-2">
            {types.map((type) => (
              <span key={type} className="px-3 py-1 bg-white/[0.04] border border-white/10 rounded-full text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                {labels[type]}
              </span>
            ))}
          </div>
        }
      />

      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 py-12">
        {architects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {architects.map((arch) => (
              <Link key={arch.id} href={`/${locale}/architects/${arch.slug}`}
                className="group bg-zinc-900 rounded-xl overflow-hidden hover-lift">
                <div className="relative overflow-hidden h-40">
                  <CardImage src={arch.image} letter={arch.name.charAt(0)} gradientClass={cardGradient(arch.slug)} alt={arch.name} />
                </div>
                <div className="p-5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{labels[arch.type]}</span>
                  <h3 className="text-base font-bold mt-1">{arch.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1">{arch._count.artists} {tr ? 'sanatçı' : 'artists'}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title={locale === 'tr' ? 'Henüz bir mimar kaydı yok.' : 'No architects recorded yet.'}
            hint={locale === 'tr' ? 'Prodüktörler, stüdyolar, etiketler — yakında' : 'Producers, studios, labels — soon'}
          />
        )}
      </div>
    </div>
  );
}
