/**
 * Public makale kartı — hem `/article` listeleme sayfası hem de
 * `/article/topic/[slug]` topic detay sayfası tarafından kullanılır.
 *
 * İki varyant:
 *   - hero (variant='hero'): tek başına büyük, 16/9 (mobil) → 21/9 (desktop)
 *   - standard (default): grid içinde küçük kart, 16/10
 */
import Link from 'next/link';
import { getDictionary, type Dictionary } from '@/i18n';
import { stripHtml } from '@/lib/seo';

export interface ArticleCardData {
  id: string;
  slug: string;
  titleTr: string;
  titleEn: string;
  contentTr: string | null;
  contentEn: string | null;
  category: string;
  featuredImage: string | null;
  author: { name: string };
}

export function categoryLabel(dict: Dictionary, category: string): string {
  const fromDict = (dict.article?.categories as Record<string, string> | undefined)?.[category];
  if (fromDict) return fromDict;
  return category
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export default function ArticleCard({
  article,
  locale,
  variant = 'standard',
}: {
  article: ArticleCardData;
  locale: string;
  variant?: 'hero' | 'standard';
}) {
  const tr = locale === 'tr';
  const title = tr ? article.titleTr : article.titleEn;
  const content = tr ? article.contentTr : article.contentEn;
  const excerpt = stripHtml(content, variant === 'hero' ? 220 : 140);
  const dict = getDictionary(locale);
  const catLabel = categoryLabel(dict, article.category);

  if (variant === 'hero') {
    return (
      <Link
        href={`/${locale}/article/${article.slug}`}
        className="group relative block rounded-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9] bg-gradient-to-br from-zinc-800 via-zinc-900 to-black hover-lift card-shine"
      >
        {article.featuredImage ? (
          <img
            src={article.featuredImage}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10">
          <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-[10px] font-bold text-white uppercase tracking-widest mb-4">
            {catLabel}
          </span>
          <h3 className="text-2xl md:text-4xl lg:text-5xl font-black font-editorial leading-tight tracking-[-0.02em] max-w-3xl group-hover:underline decoration-2 underline-offset-4">
            {title}
          </h3>
          {excerpt && (
            <p className="text-zinc-300 text-sm md:text-base mt-3 max-w-2xl line-clamp-2 font-light">
              {excerpt}
            </p>
          )}
          <div className="text-zinc-500 text-[11px] mt-4 uppercase tracking-widest font-bold">
            {article.author.name}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/${locale}/article/${article.slug}`}
      className="group relative flex flex-col rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/10 transition-colors hover-lift"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-950">
        {article.featuredImage ? (
          <img
            src={article.featuredImage}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,rgba(255,255,255,0.08),transparent_60%)]" />
        )}
        <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-[9px] font-bold text-white uppercase tracking-widest z-10">
          {catLabel}
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-base font-bold leading-snug line-clamp-2 group-hover:underline decoration-1 underline-offset-2">
          {title}
        </h3>
        {excerpt && (
          <p className="text-zinc-500 text-xs mt-2 line-clamp-3 leading-relaxed font-light flex-1">
            {excerpt}
          </p>
        )}
        <div className="text-zinc-600 text-[10px] mt-3 uppercase tracking-widest font-bold">
          {article.author.name}
        </div>
      </div>
    </Link>
  );
}
