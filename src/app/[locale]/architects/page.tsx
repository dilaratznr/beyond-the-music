export const revalidate = 30;

import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function ArchitectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
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

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen">
      <section className="bg-zinc-900 pt-24 pb-14">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white">{dict.architects.title}</h1>
          <div className="flex flex-wrap gap-2 mt-4">
            {types.map((type) => (
              <span key={type} className="px-3 py-1 bg-zinc-900/10 rounded-full text-xs font-medium text-zinc-300">{labels[type]}</span>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {architects.map((arch) => (
            <Link key={arch.id} href={`/${locale}/architects/${arch.slug}`}
              className="group bg-zinc-900 rounded-xl overflow-hidden  hover-lift">
              {arch.image && <div className="overflow-hidden img-zoom"><img src={arch.image} alt={arch.name} className="w-full h-40 object-cover" /></div>}
              <div className="p-5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{labels[arch.type]}</span>
                <h3 className="text-base font-bold mt-1">{arch.name}</h3>
                <p className="text-xs text-zinc-500 mt-1">{arch._count.artists} artists</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
