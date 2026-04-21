/**
 * Build-time self-hosted fonts for the site. Every family the super-admin
 * can pick from `FONT_OPTIONS` is loaded through `next/font/google` here,
 * which downloads the woff2 files into `_next/static/media` at build time,
 * injects metric-matched fallbacks (so the primary → real font swap does
 * not cause a visible size shift), and removes all runtime requests to
 * `fonts.googleapis.com`.
 *
 * Only the family whose `.variable` className is actually applied to the
 * rendered tree ends up with a `<link rel="preload">` in the HTML — the
 * other ~19 stay on the CDN but never hit the wire. Build time grows a
 * little; perceived performance on refresh jumps.
 */
import {
  Bricolage_Grotesque,
  Cormorant_Garamond,
  DM_Sans,
  EB_Garamond,
  Figtree,
  Fraunces,
  IBM_Plex_Mono,
  Instrument_Serif,
  Inter,
  JetBrains_Mono,
  Lora,
  Manrope,
  Outfit,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Source_Serif_4,
  Space_Grotesk,
  Syne,
  Unbounded,
  Work_Sans,
} from 'next/font/google';

/**
 * Single source of truth for the CSS custom-property name used by each
 * family. `next/font` itself generates a random className (e.g.
 * `__variable_abc123`) that *sets* this variable on the element it's
 * applied to; callers that need to *read* it (e.g. to alias `--font-body`)
 * should look the name up here rather than string-munging.
 */
export const FONT_CSS_VARS = {
  Inter: '--font-inter',
  'Space Grotesk': '--font-space-grotesk',
  'DM Sans': '--font-dm-sans',
  Manrope: '--font-manrope',
  'Work Sans': '--font-work-sans',
  Outfit: '--font-outfit',
  'Plus Jakarta Sans': '--font-plus-jakarta-sans',
  Figtree: '--font-figtree',
  'Playfair Display': '--font-playfair-display',
  Lora: '--font-lora',
  'Cormorant Garamond': '--font-cormorant-garamond',
  Fraunces: '--font-fraunces',
  'EB Garamond': '--font-eb-garamond',
  'Source Serif 4': '--font-source-serif-4',
  'Bricolage Grotesque': '--font-bricolage-grotesque',
  Unbounded: '--font-unbounded',
  Syne: '--font-syne',
  'Instrument Serif': '--font-instrument-serif',
  'JetBrains Mono': '--font-jetbrains-mono',
  'IBM Plex Mono': '--font-ibm-plex-mono',
} as const satisfies Record<string, `--font-${string}`>;

// Shared options for every *variable* font — Latin subset keeps the woff2
// small, `display: 'swap'` lets the auto-generated metric fallback render
// until the primary font arrives (typically within the same TCP roundtrip
// because the file ships from our own origin).
//
// A fresh mutable `subsets` array is returned on each call; a `readonly`
// tuple (from `as const`) trips next/font's signature, which expects a
// plain (mutable) array of subset literals.
const v = (variable: `--font-${string}`) => ({
  subsets: ['latin'] as Array<'latin'>,
  display: 'swap' as const,
  variable,
});

export const FONT_LOADERS = {
  // ── Sans ──────────────────────────────────────────────
  Inter: Inter(v(FONT_CSS_VARS['Inter'])),
  'Space Grotesk': Space_Grotesk(v(FONT_CSS_VARS['Space Grotesk'])),
  'DM Sans': DM_Sans(v(FONT_CSS_VARS['DM Sans'])),
  Manrope: Manrope(v(FONT_CSS_VARS['Manrope'])),
  'Work Sans': Work_Sans(v(FONT_CSS_VARS['Work Sans'])),
  Outfit: Outfit(v(FONT_CSS_VARS['Outfit'])),
  'Plus Jakarta Sans': Plus_Jakarta_Sans(v(FONT_CSS_VARS['Plus Jakarta Sans'])),
  Figtree: Figtree(v(FONT_CSS_VARS['Figtree'])),

  // ── Serif ─────────────────────────────────────────────
  'Playfair Display': Playfair_Display(v(FONT_CSS_VARS['Playfair Display'])),
  Lora: Lora(v(FONT_CSS_VARS['Lora'])),
  // Not a variable font — bundle the weights the app actually uses (body 400,
  // UI 600, bold 700). Omitting this would fail the build.
  'Cormorant Garamond': Cormorant_Garamond({
    subsets: ['latin'],
    display: 'swap',
    variable: FONT_CSS_VARS['Cormorant Garamond'],
    weight: ['400', '600', '700'],
  }),
  Fraunces: Fraunces(v(FONT_CSS_VARS['Fraunces'])),
  'EB Garamond': EB_Garamond(v(FONT_CSS_VARS['EB Garamond'])),
  'Source Serif 4': Source_Serif_4(v(FONT_CSS_VARS['Source Serif 4'])),

  // ── Display ───────────────────────────────────────────
  'Bricolage Grotesque': Bricolage_Grotesque(v(FONT_CSS_VARS['Bricolage Grotesque'])),
  Unbounded: Unbounded(v(FONT_CSS_VARS['Unbounded'])),
  Syne: Syne(v(FONT_CSS_VARS['Syne'])),
  // Instrument Serif ships a single 400 weight only. Hero text uses
  // `font-black` → the browser synthesises bold; same trade-off as the old
  // runtime Google Fonts path.
  'Instrument Serif': Instrument_Serif({
    subsets: ['latin'],
    display: 'swap',
    variable: FONT_CSS_VARS['Instrument Serif'],
    weight: '400',
  }),

  // ── Mono ──────────────────────────────────────────────
  'JetBrains Mono': JetBrains_Mono(v(FONT_CSS_VARS['JetBrains Mono'])),
  'IBM Plex Mono': IBM_Plex_Mono({
    subsets: ['latin'],
    display: 'swap',
    variable: FONT_CSS_VARS['IBM Plex Mono'],
    weight: ['400', '600', '700'],
  }),
} as const;

export type FontFamily = keyof typeof FONT_LOADERS;
