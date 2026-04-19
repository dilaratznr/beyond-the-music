/**
 * Shared article category definitions — used by admin list, new/edit forms,
 * and any public surfaces that need to render a category label or pill.
 *
 * Keep the `value` strings in sync with the Prisma ArticleCategory enum.
 */

export type ArticleCategoryKey =
  | 'GENRE'
  | 'CULTURAL_IMPACT'
  | 'SUBCULTURE'
  | 'CURATED_MOVEMENT'
  | 'THEORY'
  | 'LISTENING_PATH'
  | 'AI_MUSIC'
  | 'DEEP_CUT'
  | 'FASHION';

export interface ArticleCategoryInfo {
  value: ArticleCategoryKey;
  labelTr: string;
  labelEn: string;
  /** Tailwind classes for a pill: background + foreground that meet contrast. */
  pill: string;
}

export const ARTICLE_CATEGORIES: ArticleCategoryInfo[] = [
  { value: 'GENRE', labelTr: 'Tür', labelEn: 'Genre', pill: 'bg-blue-500/10 text-blue-300 border border-blue-500/20' },
  { value: 'CULTURAL_IMPACT', labelTr: 'Kültürel Etki', labelEn: 'Cultural Impact', pill: 'bg-rose-500/10 text-rose-300 border border-rose-500/20' },
  { value: 'SUBCULTURE', labelTr: 'Alt Kültür', labelEn: 'Subculture', pill: 'bg-violet-500/10 text-violet-300 border border-violet-500/20' },
  { value: 'CURATED_MOVEMENT', labelTr: 'Küratöryel Akım', labelEn: 'Curated Movement', pill: 'bg-amber-500/10 text-amber-300 border border-amber-500/20' },
  { value: 'THEORY', labelTr: 'Teori', labelEn: 'Theory', pill: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' },
  { value: 'LISTENING_PATH', labelTr: 'Dinleme Rotası', labelEn: 'Listening Path', pill: 'bg-teal-500/10 text-teal-300 border border-teal-500/20' },
  { value: 'AI_MUSIC', labelTr: 'Yapay Zeka Müziği', labelEn: 'AI Music', pill: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' },
  { value: 'DEEP_CUT', labelTr: 'Deep Cut', labelEn: 'Deep Cut', pill: 'bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20' },
  { value: 'FASHION', labelTr: 'Moda', labelEn: 'Fashion', pill: 'bg-pink-500/10 text-pink-300 border border-pink-500/20' },
];

const FALLBACK: ArticleCategoryInfo = {
  value: 'GENRE',
  labelTr: '—',
  labelEn: '—',
  pill: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
};

export function getArticleCategory(value: string | null | undefined): ArticleCategoryInfo {
  if (!value) return FALLBACK;
  return ARTICLE_CATEGORIES.find((c) => c.value === value) ?? FALLBACK;
}
