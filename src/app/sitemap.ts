import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { publishDueArticles } from '@/lib/article-publishing';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://beyondthemusic.app';
const LOCALES = ['tr', 'en'] as const;

type Entry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: Entry[] = [];

  // Home + top-level sections for both locales.
  const sections = [
    '',
    '/artist',
    '/architects',
    '/listening-paths',
    '/theory',
    '/ai-music',
    '/search',
    '/contact',
  ];
  for (const locale of LOCALES) {
    for (const section of sections) {
      entries.push({
        url: `${SITE_URL}/${locale}${section}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: section === '' ? 1 : 0.7,
      });
    }
  }

  try {
    await publishDueArticles();
    const [genres, artists, albums, articles, paths] = await Promise.all([
      prisma.genre.findMany({
        select: { slug: true, updatedAt: true },
      }),
      prisma.artist.findMany({
        select: { slug: true, updatedAt: true },
      }),
      prisma.album.findMany({
        select: { slug: true, updatedAt: true },
      }),
      prisma.article.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
      }),
      prisma.listeningPath.findMany({
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const collections: Array<{
      segment: string;
      rows: { slug: string; updatedAt: Date }[];
      priority: number;
    }> = [
      { segment: 'genre', rows: genres, priority: 0.8 },
      { segment: 'artist', rows: artists, priority: 0.9 },
      { segment: 'album', rows: albums, priority: 0.8 },
      { segment: 'article', rows: articles, priority: 0.8 },
      { segment: 'listening-paths', rows: paths, priority: 0.7 },
    ];

    for (const { segment, rows, priority } of collections) {
      for (const row of rows) {
        for (const locale of LOCALES) {
          entries.push({
            url: `${SITE_URL}/${locale}/${segment}/${row.slug}`,
            lastModified: row.updatedAt,
            changeFrequency: 'monthly',
            priority,
          });
        }
      }
    }
  } catch (e) {
    // Build-time DB unavailable (e.g. during prerender without DATABASE_URL)
    // — still return the static entries so the sitemap is valid.
    console.error('[sitemap] DB fetch failed:', e);
  }

  return entries;
}
