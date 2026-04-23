export const revalidate = 30;

import { getDictionary } from '@/i18n';
import { listPublishedArticlesByCategory } from '@/lib/db-cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isSectionEnabled } from '@/lib/site-sections';

export default async function TheoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await isSectionEnabled('theory'))) notFound();
  const dict = getDictionary(locale);

  // publishDueArticles() intentionally NOT called here — see the comment
  // in [locale]/page.tsx for the full rationale. Short version: triggering
  // a DB write on every public request forces Next out of static rendering.
  // Articles still go live via admin-visit / sitemap-hit / API triggers.
  const articles = await listPublishedArticlesByCategory('THEORY');

  const topics = [dict.theory.soundStructure, dict.theory.rhythm, dict.theory.harmony, dict.theory.texture, dict.theory.production, dict.theory.structural];

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen">
      {/* Header - artist page style */}
      <section className="bg-[#0a0a0b] pt-24 pb-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-bold font-editorial">{dict.theory.title}</h1>
          <p className="text-zinc-500 text-sm mt-2">
            {locale === 'tr' ? 'Müzik yapısı, üretim ve analiz' : 'Music structure, production and analysis'}
          </p>
          {/* Topic chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            {topics.map((t) => (
              <span key={t} className="px-4 py-1.5 bg-white/5 border border-white/5 rounded-full text-xs text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-default">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Articles grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {articles.length > 0 ? (
          <div className="gsap-stagger grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((a) => (
              <Link key={a.id} href={`/${locale}/article/${a.slug}`}
                className="group relative block rounded-xl overflow-hidden bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors">
                {a.featuredImage && (
                  <div className="overflow-hidden">
                    <img src={a.featuredImage} alt="" loading="lazy" decoding="async" className="w-full h-40 object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                  </div>
                )}
                <div className="p-5">
                  <h3 className="text-sm font-bold group-hover:underline">{locale === 'tr' ? a.titleTr : a.titleEn}</h3>
                  <p className="text-[10px] text-zinc-500 mt-2">{a.author.name}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-zinc-600 text-sm">{locale === 'tr' ? 'Henüz içerik yok.' : 'No content yet.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
