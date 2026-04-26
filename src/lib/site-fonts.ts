import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';
import { CACHE_TAGS } from '@/lib/db-cache';
import { FONT_CSS_VARS, FONT_LOADERS, type FontFamily } from '@/app/fonts';

/**
 * Super-admin font picker. Curated list (every entry adds a build file).
 * All wired in src/app/fonts.ts (self-hosted, no Google requests).
 * Roles: body (UI), display (editorial headings).
 */

export type FontCategory = 'sans' | 'serif' | 'display' | 'mono';

export interface FontOption {
  /** Family name — must match a key in FONT_LOADERS. */
  family: FontFamily;
  /** Human label in the picker. */
  label: string;
  category: FontCategory;
}

export const FONT_OPTIONS: FontOption[] = [
  // ── Sans ──────────────────────────────────────────────────────────
  { family: 'Inter', label: 'Inter', category: 'sans' },
  { family: 'Space Grotesk', label: 'Space Grotesk', category: 'sans' },
  { family: 'DM Sans', label: 'DM Sans', category: 'sans' },
  { family: 'Manrope', label: 'Manrope', category: 'sans' },
  { family: 'Work Sans', label: 'Work Sans', category: 'sans' },
  { family: 'Outfit', label: 'Outfit', category: 'sans' },
  { family: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', category: 'sans' },
  { family: 'Figtree', label: 'Figtree', category: 'sans' },

  // ── Serif ─────────────────────────────────────────────────────────
  { family: 'Playfair Display', label: 'Playfair Display', category: 'serif' },
  { family: 'Lora', label: 'Lora', category: 'serif' },
  { family: 'Cormorant Garamond', label: 'Cormorant Garamond', category: 'serif' },
  { family: 'Fraunces', label: 'Fraunces', category: 'serif' },
  { family: 'EB Garamond', label: 'EB Garamond', category: 'serif' },
  { family: 'Source Serif 4', label: 'Source Serif', category: 'serif' },

  // ── Display ───────────────────────────────────────────────────────
  { family: 'Bricolage Grotesque', label: 'Bricolage Grotesque', category: 'display' },
  { family: 'Unbounded', label: 'Unbounded', category: 'display' },
  { family: 'Syne', label: 'Syne', category: 'display' },
  { family: 'Instrument Serif', label: 'Instrument Serif', category: 'display' },

  // ── Mono ──────────────────────────────────────────────────────────
  { family: 'JetBrains Mono', label: 'JetBrains Mono', category: 'mono' },
  { family: 'IBM Plex Mono', label: 'IBM Plex Mono', category: 'mono' },
];

export const DEFAULT_BODY_FONT: FontFamily = 'Inter';
// Hero ve büyük başlıklar için yuvarlak humanist sans. Manrope: terminalleri
// (a, e, s, r gibi harflerin uçları) Plus Jakarta Sans'tan daha yuvarlak/
// yumuşak — geometrik değil, Calibri'ye en yakın "keskin hatları olmayan"
// karşılık. Tüm ağırlıklar (200-800) mevcut, hero'daki bold (700) gerçek.
// İki iterasyon sonrası seçildi: Fraunces (serif, "resmi duruyor") →
// Plus Jakarta Sans ("hâlâ keskin") → Manrope.
export const DEFAULT_DISPLAY_FONT: FontFamily = 'Manrope';

/**
 * Narrow an arbitrary (possibly DB-stored) string to a known family, or
 * fall back to the stock body font. Defensive: someone editing the DB by
 * hand shouldn't be able to inject an arbitrary family string.
 */
export function getFontOption(family: string | null | undefined): FontOption | undefined {
  if (!family) return undefined;
  return FONT_OPTIONS.find((f) => f.family === family);
}

/**
 * DB read wrapped in `unstable_cache` so it persists across requests
 * (tag: `settings`). Admin font changes call `revalidateTag('settings')`
 * via the settings route handler, so the next public request picks
 * them up. Without this wrapper the layout hit the DB on every request
 * and forced every public page out of ISR.
 */
const loadSiteFonts = unstable_cache(
  async (): Promise<{ body: FontFamily; display: FontFamily }> => {
    try {
      const rows: Array<{ key: string; value: string }> = await prisma.siteSetting.findMany({
        where: { key: { in: ['site_font_body', 'site_font_display'] } },
        select: { key: true, value: true },
      });
      const bodyRow = rows.find((r) => r.key === 'site_font_body')?.value;
      const displayRow = rows.find((r) => r.key === 'site_font_display')?.value;
      return {
        body: (getFontOption(bodyRow)?.family ?? DEFAULT_BODY_FONT) as FontFamily,
        display: (getFontOption(displayRow)?.family ?? DEFAULT_DISPLAY_FONT) as FontFamily,
      };
    } catch {
      return { body: DEFAULT_BODY_FONT, display: DEFAULT_DISPLAY_FONT };
    }
  },
  ['site-fonts'],
  { tags: [CACHE_TAGS.settings], revalidate: 300 },
);

/**
 * Read the super-admin-selected body & display fonts from SiteSetting.
 * Falls back to the stock Inter / Outfit pairing if nothing is set or the
 * stored value isn't in the curated list.
 *
 * React `cache` on top of the cross-request `unstable_cache` layer
 * dedupes a single render pass (layout + page both needing fonts).
 */
export const getSiteFonts = cache(loadSiteFonts);

/**
 * Resolve a pair of families to the next/font loaders plus a ready-to-apply
 * className + style object that the locale layout drops onto its wrapping
 * div. The `className` applies the selected fonts' `.variable` CSS
 * variables (e.g. `--font-inter`); the `style` aliases `--font-body` and
 * `--font-display` to those variables so component CSS keeps its existing
 * `var(--font-body)` / `var(--font-display)` references working.
 */
/**
 * Return the `font-family` CSS value for a given family, including the
 * metric-matched fallback `next/font` auto-generates. Use this in inline
 * styles when you need to switch fonts at runtime (e.g. the admin font
 * picker preview).
 */
export function getFontFamilyCss(family: FontFamily): string {
  return FONT_LOADERS[family].style.fontFamily;
}

export function resolveFontStyle(body: FontFamily, display: FontFamily) {
  const bodyLoader = FONT_LOADERS[body];
  const displayLoader = FONT_LOADERS[display];
  return {
    // Both variables need to be present even if body === display, so de-dupe.
    className: Array.from(
      new Set([bodyLoader.variable, displayLoader.variable]),
    ).join(' '),
    style: {
      '--font-body': `var(${FONT_CSS_VARS[body]})`,
      '--font-display': `var(${FONT_CSS_VARS[display]})`,
      fontFamily: 'var(--font-body)',
    } as React.CSSProperties,
  };
}
