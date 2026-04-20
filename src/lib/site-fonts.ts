import { cache } from 'react';
import prisma from '@/lib/prisma';

/**
 * Curated list of Google Fonts that the super admin can pick from.
 *
 * Two roles:
 *   - body: default running text / UI
 *   - display: editorial headings (Hero, large titles, `.font-editorial`)
 *
 * Keep this list small and opinionated — every entry is an extra network
 * request, and the stock Inter / Space Grotesk combo already looks great.
 */

export type FontCategory = 'sans' | 'serif' | 'display' | 'mono';

export interface FontOption {
  /** Family name exactly as Google Fonts expects it (e.g. "Space Grotesk"). */
  family: string;
  /** Human label in the picker. */
  label: string;
  category: FontCategory;
  /** CSS fallback stack (without the primary family). */
  fallback: string;
}

export const FONT_OPTIONS: FontOption[] = [
  // ── Sans ──────────────────────────────────────────────────────────
  { family: 'Inter', label: 'Inter', category: 'sans', fallback: '-apple-system, BlinkMacSystemFont, sans-serif' },
  { family: 'Space Grotesk', label: 'Space Grotesk', category: 'sans', fallback: 'Inter, sans-serif' },
  { family: 'DM Sans', label: 'DM Sans', category: 'sans', fallback: 'Inter, sans-serif' },
  { family: 'Manrope', label: 'Manrope', category: 'sans', fallback: 'Inter, sans-serif' },
  { family: 'Work Sans', label: 'Work Sans', category: 'sans', fallback: 'Inter, sans-serif' },
  { family: 'Outfit', label: 'Outfit', category: 'sans', fallback: 'Inter, sans-serif' },
  { family: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', category: 'sans', fallback: 'Inter, sans-serif' },
  { family: 'Figtree', label: 'Figtree', category: 'sans', fallback: 'Inter, sans-serif' },

  // ── Serif ─────────────────────────────────────────────────────────
  { family: 'Playfair Display', label: 'Playfair Display', category: 'serif', fallback: 'Georgia, serif' },
  { family: 'Lora', label: 'Lora', category: 'serif', fallback: 'Georgia, serif' },
  { family: 'Cormorant Garamond', label: 'Cormorant Garamond', category: 'serif', fallback: 'Georgia, serif' },
  { family: 'Fraunces', label: 'Fraunces', category: 'serif', fallback: 'Georgia, serif' },
  { family: 'EB Garamond', label: 'EB Garamond', category: 'serif', fallback: 'Georgia, serif' },
  { family: 'Source Serif 4', label: 'Source Serif', category: 'serif', fallback: 'Georgia, serif' },

  // ── Display ───────────────────────────────────────────────────────
  { family: 'Bricolage Grotesque', label: 'Bricolage Grotesque', category: 'display', fallback: 'Inter, sans-serif' },
  { family: 'Unbounded', label: 'Unbounded', category: 'display', fallback: 'Inter, sans-serif' },
  { family: 'Syne', label: 'Syne', category: 'display', fallback: 'Inter, sans-serif' },
  { family: 'Instrument Serif', label: 'Instrument Serif', category: 'display', fallback: 'Georgia, serif' },

  // ── Mono ──────────────────────────────────────────────────────────
  { family: 'JetBrains Mono', label: 'JetBrains Mono', category: 'mono', fallback: 'ui-monospace, monospace' },
  { family: 'IBM Plex Mono', label: 'IBM Plex Mono', category: 'mono', fallback: 'ui-monospace, monospace' },
];

export const DEFAULT_BODY_FONT = 'Inter';
// Hero ve büyük başlıklar `font-black` (900) kullanıyor. Space Grotesk
// yalnızca 300-700 destekliyor → 900 "fake bold" olarak çiziliyor, başlıklar
// inceltik/stilsiz görünüyordu. Outfit: 100-900 tam aralık, geometrik
// modern sans — Space Grotesk'e görsel olarak yakın ama gerçek 900'e sahip.
export const DEFAULT_DISPLAY_FONT = 'Outfit';

/** Look up an option by family name; returns undefined if not in the curated list. */
export function getFontOption(family: string | null | undefined): FontOption | undefined {
  if (!family) return undefined;
  return FONT_OPTIONS.find((f) => f.family === family);
}

/**
 * Build the `href` for a Google Fonts stylesheet that loads the given
 * families with a sensible weight range. De-dupes repeated families.
 */
export function buildGoogleFontsHref(families: string[]): string | null {
  const unique = Array.from(new Set(families.filter(Boolean)));
  if (unique.length === 0) return null;
  // 900'ü dahil et — büyük başlıklarda `font-black` (Tailwind 900) kullanılıyor.
  // 900 yüklü değilse tarayıcı 800'den fake-bold yapar, yazılar incecik
  // / stilsiz görünür (kullanıcıdan gelen "stil bozuldu" şikayetinin sebebi).
  const familyParams = unique
    .map((f) => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800;900`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
}

/**
 * Produce a CSS `font-family` value (primary + fallback) for a chosen family.
 * Wraps families containing spaces in quotes.
 */
export function toCssFontFamily(family: string): string {
  const opt = getFontOption(family);
  const fallback = opt?.fallback ?? 'Inter, sans-serif';
  const quoted = family.includes(' ') ? `'${family}'` : family;
  return `${quoted}, ${fallback}`;
}

/**
 * Read the super-admin-selected body & display fonts from SiteSetting.
 * Falls back to the stock Inter / Space Grotesk pairing if nothing is set
 * or the stored value isn't in the curated list (defensive: someone editing
 * the DB by hand shouldn't be able to inject arbitrary `@import` values).
 *
 * Cached per-request so the root layout and any child reading this don't
 * hit the DB twice.
 */
export const getSiteFonts = cache(
  async (): Promise<{ body: string; display: string }> => {
    try {
      const rows = await prisma.siteSetting.findMany({
        where: { key: { in: ['site_font_body', 'site_font_display'] } },
      });
      const bodyRow = rows.find((r) => r.key === 'site_font_body')?.value;
      const displayRow = rows.find((r) => r.key === 'site_font_display')?.value;
      return {
        body: getFontOption(bodyRow)?.family ?? DEFAULT_BODY_FONT,
        display: getFontOption(displayRow)?.family ?? DEFAULT_DISPLAY_FONT,
      };
    } catch {
      return { body: DEFAULT_BODY_FONT, display: DEFAULT_DISPLAY_FONT };
    }
  },
);
