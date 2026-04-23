/**
 * Shared OG-card renderer used by every `opengraph-image.tsx` in the app.
 *
 * Why a helper:
 *   Each detail page (article, artist, album, genre, ...) wants the same
 *   branded 1200×630 social card — dark background, eyebrow tag, editorial
 *   title, site monogram bottom-right. Duplicating the JSX across six
 *   files drifts fast; centralizing it gives every card the same visual
 *   language for free.
 *
 * Constraints imposed by `next/og` (satori):
 *   - Only flexbox layout. No `display: grid`, no `float`.
 *   - No CSS variables — all colors/sizes are literal.
 *   - External fonts require fetching binary TTF/OTF files and passing
 *     them in `{ fonts: [...] }`. We skip that: satori's built-in Inter
 *     fallback reads clean enough for social cards and keeps the edge
 *     function cold-start light.
 *
 * The output is the JSX tree — callers wrap it in `new ImageResponse(...)`
 * so they can supply their own `size` export if needed.
 */

import type { ReactElement } from 'react';

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png' as const;

/**
 * Inputs for a single social card.
 * `title` is required; every other field degrades gracefully.
 */
export type OgCardProps = {
  /** Main headline — shown big, center-left. Truncated client-side if it overflows. */
  title: string;
  /** Small uppercase tracking-widest label above the title (e.g. "ARTIST", "ALBUM"). */
  eyebrow?: string;
  /** Optional secondary line below the title (e.g. author name, artist name). */
  subtitle?: string;
};

/**
 * Returns the JSX passed to `new ImageResponse(...)`.
 * Callers stay thin:
 *
 *   export default async function Image({ params }) {
 *     const { title, ... } = await loadData(params);
 *     return new ImageResponse(renderOgCard({ title, ... }), OG_SIZE);
 *   }
 */
export function renderOgCard({
  title,
  eyebrow,
  subtitle,
}: OgCardProps): ReactElement {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        // Layered dark background: the site bg (#0a0a0b) plus a subtle
        // radial highlight upper-left so the card doesn't look flat.
        backgroundColor: '#0a0a0b',
        backgroundImage:
          'radial-gradient(circle at 20% 15%, rgba(255,255,255,0.08), transparent 55%), linear-gradient(135deg, #151518 0%, #0a0a0b 60%)',
        color: '#ffffff',
        padding: '72px',
        // Letter-spacing / line-height inherited by children unless they
        // override — keeps the overall typographic rhythm predictable.
        letterSpacing: '-0.02em',
      }}
    >
      {/* Top zone: eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {eyebrow ? (
          <>
            <div
              style={{
                width: 48,
                height: 2,
                backgroundColor: '#10b981',
                marginRight: 20,
              }}
            />
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: '#a1a1aa',
              }}
            >
              {eyebrow}
            </div>
          </>
        ) : (
          // Reserve vertical space even with no eyebrow so every card has
          // the same "title sits lower than perfect center" composition.
          <div style={{ height: 24 }} />
        )}
      </div>

      {/* Middle zone: title + subtitle */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          // Allow title to wrap on long inputs without clipping.
          maxWidth: 1000,
        }}
      >
        <div
          style={{
            fontSize: 84,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: '#ffffff',
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              marginTop: 24,
              fontSize: 28,
              fontWeight: 500,
              color: '#d4d4d8',
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>

      {/* Bottom zone: site monogram + bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: '#ffffff',
          }}
        >
          Beyond The Music
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 16,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: '#71717a',
          }}
        >
          <div style={{ width: 40, height: 1, backgroundColor: '#52525b' }} />
          beyondthemusic.app
        </div>
      </div>
    </div>
  );
}
