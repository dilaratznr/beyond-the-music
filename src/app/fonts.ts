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
 * other ~19 stay on disk but never hit the wire. Build time grows a
 * little; perceived performance on refresh jumps.
 *
 * ─── IMPORTANT ──────────────────────────────────────────────────────────
 * Next.js' `next/font` SWC plugin requires every loader call to be
 * assigned DIRECTLY to a top-level `const`. It can't live inside an
 * object literal or be returned from a helper. That's why each family
 * gets its own `const fontFoo = FooFamily({...})` binding below — only
 * after that do we collect them into `FONT_LOADERS`.
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
// The SWC plugin statically analyses the call site, so the options object
// must be a plain literal; we can't spread a shared helper into it. The
// repetition below is intentional.

// ── Sans ───────────────────────────────────────────────────────────────
const fontInter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['Inter'],
});
const fontSpaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['Space Grotesk'],
});
const fontDmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['DM Sans'],
});
const fontManrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['Manrope'],
});
const fontWorkSans = Work_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['Work Sans'],
});
const fontOutfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['Outfit'],
});
const fontPlusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['Plus Jakarta Sans'],
});
const fontFigtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['Figtree'],
});

// ── Serif ──────────────────────────────────────────────────────────────
const fontPlayfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['Playfair Display'],
});
const fontLora = Lora({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['Lora'],
});
// Cormorant Garamond is not a variable font — bundle the weights the app
// actually uses (body 400, UI 600, bold 700). Omitting `weight` would fail
// the build.
const fontCormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['Cormorant Garamond'],
  weight: ['400', '600', '700'],
});
const fontFraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['Fraunces'],
});
const fontEbGaramond = EB_Garamond({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['EB Garamond'],
});
const fontSourceSerif4 = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['Source Serif 4'],
});

// ── Display ────────────────────────────────────────────────────────────
const fontBricolageGrotesque = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['Bricolage Grotesque'],
});
const fontUnbounded = Unbounded({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['Unbounded'],
});
const fontSyne = Syne({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['Syne'],
});
// Instrument Serif ships a single 400 weight only. Hero text uses
// `font-black` → the browser synthesises bold; same trade-off as the old
// runtime Google Fonts path.
const fontInstrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['Instrument Serif'],
  weight: '400',
});

// ── Mono ───────────────────────────────────────────────────────────────
const fontJetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['JetBrains Mono'],
});
const fontIbmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: FONT_CSS_VARS['IBM Plex Mono'],
  weight: ['400', '600', '700'],
});

export const FONT_LOADERS = {
  Inter: fontInter,
  'Space Grotesk': fontSpaceGrotesk,
  'DM Sans': fontDmSans,
  Manrope: fontManrope,
  'Work Sans': fontWorkSans,
  Outfit: fontOutfit,
  'Plus Jakarta Sans': fontPlusJakartaSans,
  Figtree: fontFigtree,

  'Playfair Display': fontPlayfairDisplay,
  Lora: fontLora,
  'Cormorant Garamond': fontCormorantGaramond,
  Fraunces: fontFraunces,
  'EB Garamond': fontEbGaramond,
  'Source Serif 4': fontSourceSerif4,

  'Bricolage Grotesque': fontBricolageGrotesque,
  Unbounded: fontUnbounded,
  Syne: fontSyne,
  'Instrument Serif': fontInstrumentSerif,

  'JetBrains Mono': fontJetBrainsMono,
  'IBM Plex Mono': fontIbmPlexMono,
} as const;

export type FontFamily = keyof typeof FONT_LOADERS;
