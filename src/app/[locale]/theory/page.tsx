export const revalidate = 30;

import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isSectionEnabled } from '@/lib/site-sections';
import PageHero from '@/components/public/PageHero';
import EmptyState from '@/components/public/EmptyState';

export default async function TheoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await isSectionEnabled('theory'))) notFound();
  const dict = getDictionary(locale);

  // publishDueArticles() intentionally NOT called here — see comment in
  // [locale]/ai-music/page.tsx. Short version: DB writes during render
  // force Next out of ISR.
  const articles = await prisma.article.findMany({
    where: { category: 'THEORY', status: 'PUBLISHED' },
    include: { author: { select: { name: true } } },
    orderBy: { publishedAt: 'desc' },
  });

  const topics = [dict.theory.soundStructure, dict.theory.rhythm, dict.theory.harmony, dict.theory.texture, dict.theory.production, dict.theory.structural];
  const tr = locale === 'tr';

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen">
      <PageHero
        eyebrow={tr ? 'Analiz' : 'Analysis'}
        title={dict.theory.title}
        subtitle={tr ? 'Müzik yapısı, üretim estetiği, form ve doku analizi.' : 'Music structure, production aesthetics, form and texture.'}
        meta={
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <span key={t} className="px-3 py-1 bg-white/[0.04] border border-white/10 rounded-full text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                {t}
              </span>
            ))}
          </div>
        }
      />

      {/* Articles grid */}
      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 py-12 md:py-16">
        {articles.length > 0 ? (
          <div className="gsap-stagger grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((a) => (
              <Link key={a.id} href={`/${locale}/article/${a.slug}`}
                className="group relative block rounded-xl overflow-hidden bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors">
                {a.featuredImage && (
                  <div className="overflow-hidden">
                    <img src={a.featuredImage} alt="" className="w-full h-40 object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                  </div>
                )}
                <div className="p-5">
                  <h3 className="text-sm font-bold group-hover:underline">{tr ? a.titleTr : a.titleEn}</h3>
                  <p className="text-[10px] text-zinc-500 mt-2">{a.author.name}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title={tr ? 'Henüz teori makalesi yayınlanmadı.' : 'No theory articles published yet.'}
            hint={tr ? 'Analiz yazıları — yakında' : 'Analysis pieces — soon'}
          />
        )}
      </div>
    </div>
  );
}
