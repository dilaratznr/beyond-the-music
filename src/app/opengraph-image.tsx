/**
 * Default Open Graph image for the site.
 *
 * Served automatically by Next for:
 *   - the home page
 *   - any route that doesn't ship its own `opengraph-image.tsx`
 *
 * The actual visual is rendered by `renderOgCard` in `src/lib/og-card.tsx`
 * so every page shares the same branded look.
 */

import { ImageResponse } from 'next/og';
import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Beyond The Music — Küratöryel Müzik Platformu';

export default function Image() {
  return new ImageResponse(
    renderOgCard({
      eyebrow: 'Curated Music Platform',
      title: 'Beyond The Music',
      subtitle: 'Müziğin ötesindeki kültürü keşfeden küratöryel platform.',
    }),
    size,
  );
}
