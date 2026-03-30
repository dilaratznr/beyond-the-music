export const revalidate = 30;

import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import ScrollReveal from '@/components/public/ScrollReveal';

export default async function ArtistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  const artists = await prisma.artist.findMany({
    include: { genres: { include: { genre: true } }, _count: { select: { albums: true } } },
    orderBy: { name: 'asc' },
  });

  const soloArtists = artists.filter((a) => a.type === 'SOLO');
  const groups = artists.filter((a) => a.type === 'GROUP');
  const composers = artists.filter((a) => a.type === 'COMPOSER');

  function ArtistGrid({ list }: { list: typeof artists }) {
    if (list.length === 0) return <p className="text-zinc-600 text-sm col-span-full py-8 text-center">{locale === 'tr' ? 'Henüz içerik yok' : 'No content yet'}</p>;
    return (
      <>
        {list.map((a, i) => (
          <ScrollReveal key={a.id} delay={i * 40} direction="up">
            <Link href={`/${locale}/artist/${a.slug}`}
              className="group relative block rounded-xl overflow-hidden aspect-[3/4] bg-zinc-800 img-zoom hover-lift">
              {a.image ? <img src={a.image} alt={a.name} className="absolute inset-0 w-full h-full object-cover" />
                : <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-4xl text-white/10">♪</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="text-white font-bold text-xs">{a.name}</h3>
                <p className="text-white/40 text-[9px] mt-0.5">
                  {a.genres.map((g) => locale === 'tr' ? g.genre.nameTr : g.genre.nameEn).join(' · ')}
                </p>
              </div>
            </Link>
          </ScrollReveal>
        ))}
      </>
    );
  }

  return (
    <div className="bg-[#0a0a0b] text-white">
      <section className="bg-[#0a0a0b] pt-24 pb-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-bold font-editorial">{dict.artist.title}</h1>
          <div className="flex gap-3 mt-4">
            {[
              { id: 'solo', label: dict.artist.solo, count: soloArtists.length },
              { id: 'group', label: dict.artist.group, count: groups.length },
              { id: 'composer', label: dict.artist.composer, count: composers.length },
            ].map((tab) => (
              <a key={tab.id} href={`#${tab.id}`}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-full transition-colors border border-white/5">
                {tab.label} <span className="text-white/30 ml-1">{tab.count}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-14">
        {soloArtists.length > 0 && (
          <section id="solo" className="scroll-mt-24">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              {dict.artist.solo}
              <span className="text-xs text-zinc-600 font-normal">({soloArtists.length})</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <ArtistGrid list={soloArtists} />
            </div>
          </section>
        )}
        {groups.length > 0 && (
          <section id="group" className="scroll-mt-24">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              {dict.artist.group}
              <span className="text-xs text-zinc-600 font-normal">({groups.length})</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <ArtistGrid list={groups} />
            </div>
          </section>
        )}
        {composers.length > 0 && (
          <section id="composer" className="scroll-mt-24">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              {dict.artist.composer}
              <span className="text-xs text-zinc-600 font-normal">({composers.length})</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <ArtistGrid list={composers} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
