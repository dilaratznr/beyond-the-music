import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';
import { CACHE_TAGS } from '@/lib/db-cache';
import { publishDueArticles } from '@/lib/article-publishing';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://beyondthemusic.app';
const LOCALES = ['tr', 'en'] as const;

type Entry = MetadataRoute.Sitemap[number];

// Each slug listing is cached and tagged. When admin routes call
// `revalidateTag(CACHE_TAGS.<model>, 'max')` after a write, the next
// sitemap request picks up the new URLs without waiting for a full
// ISR tick. Selecting ONLY slug + updatedAt keeps the payload small
// and serializable.
const getGenreSlugs = unstable_cache(
  async () =>
    prisma.genre.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
    }),
  ['sitemap', 'genre-slugs'],
  { tags: [CACHE_TAGS.genre], revalidate: 300 },
);

const getArtistSlugs = unstable_cache(
  async () =>
    prisma.artist.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
    }),
  ['sitemap', 'artist-slugs'],
  { tags: [CACHE_TAGS.artist], revalidate: 300 },
);

const getAlbumSlugs = unstable_cache(
  async () =>
    prisma.album.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
    }),
  ['sitemap', 'album-slugs'],
  { tags: [CACHE_TAGS.album], revalidate: 300 },
);

const getArticleSlugs = unstable_cache(
  async () =>
    prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
    }),
  ['sitemap', 'article-slugs'],
  { tags: [CACHE_TAGS.article], revalidate: 300 },
);

const getListeningPathSlugs = unstable_cache(
  async () =>
    prisma.listeningPath.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
    }),
  ['sitemap', 'listening-path-slugs'],
  { tags: [CACHE_TAGS.listeningPath], revalidate: 300 },
);

const getArchitectSlugs = unstable_cache(
  async () =>
    prisma.architect.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
    }),
  ['sitemap', 'architect-slugs'],
  { tags: [CACHE_TAGS.architect], revalidate: 300 },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: Entry[] = [];

  // Home + top-level sections for both locales.
  const sections = [
    '',
    '/genre',
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
    // Flip any due-scheduled articles BEFORE we enumerate — otherwise
    // the sitemap misses them for the rest of this revalidation window.
    await publishDueArticles();

    const [genres, artists, albums, articles, paths, architects] =
      await Promise.all([
        getGenreSlugs(),
        getArtistSlugs(),
        getAlbumSlugs(),
        getArticleSlugs(),
        getListeningPathSlugs(),
        getArchitectSlugs(),
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
      { segment: 'architects', rows: architects, priority: 0.6 },
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
    // Build-time DB unavailable (e.g. prerender without DATABASE_URL) —
    // still return the static entries so the sitemap is valid.
    console.error('[sitemap] DB fetch failed:', e);
  }

  return entries;
}
