/**
 * Build-time self-hosted fonts (next/font/google). SWC plugin requires
 * plain object literals with inline literal strings — no refactoring.
 * Only preloaded family hits the wire; others load on-demand. FONT_CSS_VARS
 * table mirrors `variable:` values below (keep in sync).
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

// Font loader calls — inline literals only (SWC plugin limitation).

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
// Non-variable font — explicitly bundle used weights (400, 600, 700).
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
// Single 400 weight; browser synthesises bold (same as old runtime path).
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
