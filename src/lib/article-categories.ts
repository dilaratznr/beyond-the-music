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

// Tüm kategoriler aynı editoryal pill stili (Dilara geri bildirimi:
// "her yerde renkli pill istemiyorum"). Kategori farkını metin ayırt
// ediyor; renk gerekli değil. Public tarafta ve admin'de tek ton.
const CATEGORY_PILL = 'bg-zinc-900/40 text-zinc-300 border border-zinc-800';

export const ARTICLE_CATEGORIES: ArticleCategoryInfo[] = [
  { value: 'GENRE', labelTr: 'Tür', labelEn: 'Genre', pill: CATEGORY_PILL },
  { value: 'CULTURAL_IMPACT', labelTr: 'Kültürel Etki', labelEn: 'Cultural Impact', pill: CATEGORY_PILL },
  { value: 'SUBCULTURE', labelTr: 'Alt Kültür', labelEn: 'Subculture', pill: CATEGORY_PILL },
  { value: 'CURATED_MOVEMENT', labelTr: 'Küratöryel Akım', labelEn: 'Curated Movement', pill: CATEGORY_PILL },
  { value: 'THEORY', labelTr: 'Teori', labelEn: 'Theory', pill: CATEGORY_PILL },
  { value: 'LISTENING_PATH', labelTr: 'Dinleme Rotası', labelEn: 'Listening Path', pill: CATEGORY_PILL },
  { value: 'AI_MUSIC', labelTr: 'Yapay Zeka Müziği', labelEn: 'AI Music', pill: CATEGORY_PILL },
  { value: 'DEEP_CUT', labelTr: 'Deep Cut', labelEn: 'Deep Cut', pill: CATEGORY_PILL },
  { value: 'FASHION', labelTr: 'Moda', labelEn: 'Fashion', pill: CATEGORY_PILL },
];

const FALLBACK: ArticleCategoryInfo = {
  value: 'GENRE',
  labelTr: '—',
  labelEn: '—',
  pill: CATEGORY_PILL,
};

export function getArticleCategory(value: string | null | undefined): ArticleCategoryInfo {
  if (!value) return FALLBACK;
  return ARTICLE_CATEGORIES.find((c) => c.value === value) ?? FALLBACK;
}
