/**
 * Per-genre OG card.
 */

import { ImageResponse } from 'next/og';
import prisma from '@/lib/prisma';
import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Beyond The Music genre';

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const genre = await prisma.genre.findUnique({
    where: { slug },
    select: {
      nameTr: true,
      nameEn: true,
      parent: { select: { nameTr: true, nameEn: true } },
    },
  });

  if (!genre) {
    return new ImageResponse(
      renderOgCard({ eyebrow: 'Genre', title: 'Beyond The Music' }),
      size,
    );
  }

  const title = locale === 'tr' ? genre.nameTr : genre.nameEn;
  // If this is a sub-genre, show the parent genre as subtitle context.
  const parentName = genre.parent
    ? locale === 'tr'
      ? genre.parent.nameTr
      : genre.parent.nameEn
    : undefined;

  return new ImageResponse(
    renderOgCard({
      eyebrow: 'Genre',
      title,
      subtitle: parentName ? `${locale === 'tr' ? 'Alt tür' : 'Subgenre'} · ${parentName}` : undefined,
    }),
    size,
  );
}
