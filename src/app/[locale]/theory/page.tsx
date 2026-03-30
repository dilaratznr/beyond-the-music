export const revalidate = 30;

import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function TheoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  const articles = await prisma.article.findMany({
    where: { category: 'THEORY', status: 'PUBLISHED' },
    include: { author: { select: { name: true } } },
    orderBy: { publishedAt: 'desc' },
  });

  const topics = [dict.theory.soundStructure, dict.theory.rhythm, dict.theory.harmony, dict.theory.texture, dict.theory.production, dict.theory.structural];

  return (
    <div className="bg-[var(--bg)] text-[var(--text)] min-h-screen pt-16">
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <p className="text-zinc-600 text-[10px] tracking-[0.3em] uppercase mb-3">04</p>
        <h1 className="font-display font-black" style={{ fontSize: 'var(--display-sm)' }}>{dict.theory.title}</h1>

        {/* Topics as outline text */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-8">
          {topics.map((t) => (
            <span key={t} className="font-display font-bold text-lg"
              style={{ WebkitTextStroke: '0.8px rgba(255,255,255,0.15)', color: 'transparent' }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Articles */}
      <div className="max-w-[1600px] mx-auto px-6 pb-20">
        {articles.length > 0 ? (
          <div className="gsap-stagger space-y-1 border-t border-white/5 pt-8">
            {articles.map((a) => (
              <Link key={a.id} href={`/${locale}/article/${a.slug}`}
                className="group flex items-center justify-between py-5 border-b border-white/5 hover:pl-3 transition-all">
                <div className="flex items-center gap-6">
                  {a.featuredImage && <img src={a.featuredImage} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />}
                  <div>
                    <h3 className="text-base font-semibold group-hover:underline underline-offset-4 decoration-1">{locale === 'tr' ? a.titleTr : a.titleEn}</h3>
                    <p className="text-zinc-600 text-[10px] mt-1">{a.author.name}</p>
                  </div>
                </div>
                <span className="text-zinc-700 text-lg group-hover:text-white group-hover:translate-x-1 transition-all">→</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-zinc-600 text-center py-20 text-sm">{locale === 'tr' ? 'Henüz içerik yok.' : 'No content yet.'}</p>
        )}
      </div>
    </div>
  );
}
