/**
 * Per-album OG card.
 */

import { ImageResponse } from 'next/og';
import prisma from '@/lib/prisma';
import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Beyond The Music album';

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const album = await prisma.album.findUnique({
    where: { slug },
    select: {
      title: true,
      releaseDate: true,
      artist: { select: { name: true } },
    },
  });

  if (!album) {
    return new ImageResponse(
      renderOgCard({ eyebrow: 'Album', title: 'Beyond The Music' }),
      size,
    );
  }

  const year = album.releaseDate
    ? new Date(album.releaseDate).getFullYear().toString()
    : undefined;
  const subtitle = year
    ? `${album.artist.name} · ${year}`
    : album.artist.name;

  return new ImageResponse(
    renderOgCard({
      eyebrow: 'Album',
      title: album.title,
      subtitle,
    }),
    size,
  );
}
