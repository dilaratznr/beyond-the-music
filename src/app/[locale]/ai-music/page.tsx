export const revalidate = 30;

import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isSectionEnabled } from '@/lib/site-sections';
import PageHero from '@/components/public/PageHero';
import EmptyState from '@/components/public/EmptyState';
import CardImage from '@/components/public/CardImage';

// Görseli olmayan makale kartları için slug-hash ile seçilen stabil
// palet. Her kart benzersiz bir üretilmiş görünüm alıyor.
const FALLBACK_PALETTES = [
  'from-indigo-900/60 via-zinc-900 to-zinc-950',
  'from-cyan-900/55 via-zinc-900 to-zinc-950',
  'from-fuchsia-900/50 via-zinc-900 to-zinc-950',
  'from-emerald-900/50 via-zinc-900 to-zinc-950',
  'from-amber-900/45 via-zinc-900 to-zinc-950',
  'from-rose-900/50 via-zinc-900 to-zinc-950',
];
function paletteForSlug(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTES[h % FALLBACK_PALETTES.length];
}

export default async function AiMusicPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await isSectionEnabled('aiMusic'))) notFound();
  const dict = getDictionary(locale);
  const tr = locale === 'tr';

  // publishDueArticles() intentionally NOT called here — triggering a
  // DB write on every public render forces Next out of static rendering
  // and kills ISR (Cache-Control: no-store on every request).
  // Scheduled articles still flip via admin dashboard / sitemap / API.
  const articles = await prisma.article.findMany({
    where: { category: 'AI_MUSIC', status: 'PUBLISHED' },
    include: { author: { select: { name: true } } },
    orderBy: { publishedAt: 'desc' },
  });

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen">
      <PageHero
        eyebrow={tr ? 'Algoritma' : 'Algorithm'}
        title={dict.nav.aiMusic}
        subtitle={
          tr
            ? 'Algoritmik üretim, insan-makine işbirliği ve geleceğe dair prodüksiyon trendleri.'
            : 'Algorithmic production, human-machine collaboration, and future production trends.'
        }
        meta={
          <span className="text-[11px] uppercase tracking-[0.3em] text-zinc-500 font-semibold">
            {articles.length} {tr ? 'makale' : 'articles'}
          </span>
        }
      />

      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 py-12 md:py-16">
        {articles.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-5">
            {articles.map((a) => {
              const title = tr ? a.titleTr : a.titleEn;
              return (
                <Link key={a.id} href={`/${locale}/article/${a.slug}`}
                  className="group bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden hover:bg-white/[0.05] hover-lift transition-colors">
                  {/* Görsel yoksa boş alan yerine CardImage fallback
                      (gradient + watermark). Dilara geri bildirimi:
                      "bazi seylerde gorsel yok, onlara da gorsel
                      koysun". */}
                  <div className="relative w-full h-44 overflow-hidden bg-zinc-900 img-zoom">
                    <CardImage
                      src={a.featuredImage}
                      letter={title?.charAt(0) ?? '♪'}
                      gradientClass={paletteForSlug(a.slug)}
                      imgClassName="opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-editorial text-base md:text-lg font-semibold tracking-[-0.01em] group-hover:underline decoration-1 underline-offset-4">{title}</h3>
                    <p className="text-[11px] text-zinc-500 mt-2 uppercase tracking-wider">{a.author.name}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={tr ? 'AI müzik yazıları henüz yayında değil.' : 'AI music pieces not yet published.'}
            hint={tr ? 'İlk yazılar — yakında' : 'First pieces — soon'}
          />
        )}
      </div>
    </div>
  );
}
