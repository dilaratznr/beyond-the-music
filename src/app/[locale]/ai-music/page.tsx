export const revalidate = 30;

import { getDictionary } from '@/i18n';
import { listPublishedArticlesByCategory } from '@/lib/db-cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isSectionEnabled } from '@/lib/site-sections';

export default async function AiMusicPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await isSectionEnabled('aiMusic'))) notFound();
  const dict = getDictionary(locale);

  // publishDueArticles() intentionally NOT called here — see the comment
  // in [locale]/page.tsx for the full rationale.
  const articles = await listPublishedArticlesByCategory('AI_MUSIC');

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen">
      <section className="bg-zinc-900 pt-24 pb-14">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white">{dict.nav.aiMusic}</h1>
          <p className="text-zinc-400 mt-2 text-sm max-w-lg">
            {locale === 'tr' ? 'Algoritmik üretim, insan-makine işbirliği ve geleceğe dair üretim trendleri' : 'Algorithmic production, human-machine collaboration, and future production trends'}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {articles.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-5">
            {articles.map((a) => (
              <Link key={a.id} href={`/${locale}/article/${a.slug}`}
                className="group bg-zinc-900 rounded-xl overflow-hidden  hover-lift">
                {a.featuredImage && <div className="overflow-hidden img-zoom"><img src={a.featuredImage} alt="" loading="lazy" decoding="async" className="w-full h-44 object-cover" /></div>}
                <div className="p-5">
                  <h3 className="text-base font-bold group-hover:underline">{locale === 'tr' ? a.titleTr : a.titleEn}</h3>
                  <p className="text-xs text-zinc-500 mt-2">{a.author.name}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-center py-12">{locale === 'tr' ? 'Henüz içerik yok.' : 'No content yet.'}</p>
        )}
      </div>
    </div>
  );
}
