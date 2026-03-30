export const revalidate = 30;

import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';

export default async function ListeningPathsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale);

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
      <section className="bg-zinc-900 pt-24 pb-14">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-500/50 font-bold mb-2">Curated Journeys</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{dict.listeningPaths.title}</h1>
          <p className="text-zinc-400 mt-3 max-w-xl text-sm">{dict.listeningPaths.description}</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-wrap gap-2 mb-10">
          {Object.entries(typeLabels).map(([key, label]) => (
            <span key={key} className="px-3 py-1.5 bg-zinc-900 rounded-full text-xs font-medium text-zinc-400 border border-white/10">
              {label}
            </span>
          ))}
        </div>

        {paths.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paths.map((p) => (
              <div key={p.id} className="group relative rounded-xl overflow-hidden aspect-[4/5] bg-zinc-800 img-zoom hover-lift">
                {p.image && <img src={p.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-500" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <span className="inline-block px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-full mb-2">
                    {typeLabels[p.type] || p.type}
                  </span>
                  <h3 className="text-lg font-bold text-white">{locale === 'tr' ? p.titleTr : p.titleEn}</h3>
                  <p className="text-white/40 text-xs mt-2 leading-relaxed">{locale === 'tr' ? p.descriptionTr : p.descriptionEn}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-center py-12">{locale === 'tr' ? 'Henüz içerik yok.' : 'No content yet.'}</p>
        )}
      </div>
    </div>
  );
}
