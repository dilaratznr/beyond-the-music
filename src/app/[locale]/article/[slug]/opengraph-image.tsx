/**
 * Per-article OG card.
 *
 * Next discovers this file at route `/[locale]/article/[slug]` and wires
 * it into the article page's Open Graph metadata automatically — no need
 * to mention it from `generateMetadata`.
 *
 * Routes are prerendered at build time via the page's `generateStaticParams`,
 * so these images are generated once and served as static PNGs afterwards.
 */

import { ImageResponse } from 'next/og';
import prisma from '@/lib/prisma';
import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Beyond The Music article';

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug },
    select: {
      titleTr: true,
      titleEn: true,
      category: true,
      author: { select: { name: true } },
    },
  });

  // Fallback to generic card if the article disappeared between static
  // params generation and now.
  const title = article
    ? locale === 'tr'
      ? article.titleTr
      : article.titleEn
    : 'Beyond The Music';
  const eyebrow = article?.category.replace(/_/g, ' ') || 'Article';
  const subtitle = article?.author.name || undefined;

  return new ImageResponse(
    renderOgCard({ title, eyebrow, subtitle }),
    size,
  );
}
