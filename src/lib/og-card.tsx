/**
 * Shared OG card renderer (satori via next/og). Dark bg + eyebrow + title +
 * monogram. Flexbox-only, no CSS vars, no external fonts (Inter fallback).
 * Callers wrap in ImageResponse with custom size.
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
 * Returns JSX for ImageResponse. Callers pass data, receive JSX to wrap.
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
        // Dark bg + subtle radial highlight.
        backgroundColor: '#0a0a0b',
        backgroundImage:
          'radial-gradient(circle at 20% 15%, rgba(255,255,255,0.08), transparent 55%), linear-gradient(135deg, #151518 0%, #0a0a0b 60%)',
        color: '#ffffff',
        padding: '72px',
        // Typography inherited by children unless overridden.
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
          // Reserve space without eyebrow for consistent title placement.
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
