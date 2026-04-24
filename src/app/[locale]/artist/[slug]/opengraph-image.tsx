/**
 * Per-artist OG card.
 * See `src/app/[locale]/article/[slug]/opengraph-image.tsx` for the
 * general pattern (build-time prerender via page's generateStaticParams).
 */

import { ImageResponse } from 'next/og';
import prisma from '@/lib/prisma';
import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Beyond The Music artist';

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const artist = await prisma.artist.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: {
      name: true,
      type: true,
      genres: { where: { genre: { status: 'PUBLISHED' } }, include: { genre: true }, take: 3 },
    },
  });

  if (!artist) {
    return new ImageResponse(
      renderOgCard({
        eyebrow: 'Artist',
        title: 'Beyond The Music',
      }),
      size,
    );
  }

  const genreNames = artist.genres
    .map(({ genre }) => (locale === 'tr' ? genre.nameTr : genre.nameEn))
    .filter(Boolean)
    .join(' · ');

  return new ImageResponse(
    renderOgCard({
      eyebrow: artist.type === 'GROUP' ? 'Group' : artist.type === 'COMPOSER' ? 'Composer' : 'Artist',
      title: artist.name,
      subtitle: genreNames || undefined,
    }),
    size,
  );
}
