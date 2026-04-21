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
 * Next.js' `next/font` SWC plugin statically analyses each loader call.
 * Its options object must be a PLAIN OBJECT LITERAL with literal string
 * values — no helpers, no spread, no property access into other consts.
 * That's why `variable: '--font-...'` is spelled out inline for every
 * family, and `FONT_CSS_VARS` below mirrors those exact strings for any
 * caller that needs to read them back (e.g. to alias `--font-body`).
 * Keep the two tables in sync.
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

// ─── Font loader calls ────────────────────────────────────────────────
// Each call is assigned to its own module-scope const with an inline,
// fully-literal options object. Don't refactor these to share a helper
// or pull `variable` from another const — the SWC plugin will reject it.

// ── Sans ───────────────────────────────────────────────────────────────
const fontInter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
const fontSpaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});
const fontDmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
});
const fontManrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});
const fontWorkSans = Work_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-work-sans',
});
const fontOutfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});
const fontPlusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta-sans',
});
const fontFigtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-figtree',
});

// ── Serif ──────────────────────────────────────────────────────────────
const fontPlayfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair-display',
});
const fontLora = Lora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lora',
});
// Cormorant Garamond is not a variable font — bundle the weights the app
// actually uses (body 400, UI 600, bold 700). Omitting `weight` would fail
// the build.
const fontCormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-cormorant-garamond',
  weight: ['400', '600', '700'],
});
const fontFraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
});
const fontEbGaramond = EB_Garamond({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-eb-garamond',
});
const fontSourceSerif4 = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-serif-4',
});

// ── Display ────────────────────────────────────────────────────────────
const fontBricolageGrotesque = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bricolage-grotesque',
});
const fontUnbounded = Unbounded({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-unbounded',
});
const fontSyne = Syne({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-syne',
});
// Instrument Serif ships a single 400 weight only. Hero text uses
// `font-black` → the browser synthesises bold; same trade-off as the old
// runtime Google Fonts path.
const fontInstrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-serif',
  weight: '400',
});

// ── Mono ───────────────────────────────────────────────────────────────
const fontJetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});
const fontIbmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ibm-plex-mono',
  weight: ['400', '600', '700'],
});

/**
 * CSS variable names — must mirror the `variable:` values passed to each
 * loader above. Used by `site-fonts.ts#resolveFontStyle` to alias
 * `--font-body` / `--font-display` onto the selected family's variable.
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
