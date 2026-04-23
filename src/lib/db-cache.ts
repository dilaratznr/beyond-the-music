/**
 * Centralized read-side caching for Prisma queries.
 *
 * Why bother, given pages already export `revalidate = 30`?
 *   Route-level ISR caches the rendered HTML, but each revalidation
 *   re-runs the Prisma queries. With `unstable_cache`:
 *     - The same query shape is shared across routes/locales — /tr and /en
 *       both querying the main genre list hit Postgres once, not twice.
 *     - Admin writes call `revalidateTag(...)` and the public pages see
 *       fresh data on the *next* request instead of waiting up to 30s.
 *     - Per-query revalidate can be bumped (we use 5 min) because tag
 *       invalidation keeps data visibly fresh regardless.
 *
 * Tag vocabulary mirrors the Prisma models admin routes mutate; see the
 * revalidateTag calls in the api/ route handlers for the companion side.
 *
 * Constraints to keep in mind when adding new cached queries:
 *   1. Arguments must be JSON-serializable primitives (strings, numbers,
 *      booleans, null, arrays/objects thereof). No Date, no Prisma enums
 *      as imports — pass them as string literals.
 *   2. Return values go through RSC serialization — Date is fine, class
 *      instances are NOT. Prisma's default output is plain objects with
 *      Date fields, so normal findMany results are safe.
 *   3. Don't read cookies/headers/searchParams inside these functions —
 *      the cache key has no idea about request context and would serve
 *      the wrong user's data.
 */

import { unstable_cache } from 'next/cache';
import prisma from './prisma';

// ---------------------------------------------------------------------------
// Tag vocabulary
// ---------------------------------------------------------------------------

/**
 * Stable tag strings. Admin route handlers import these when calling
 * `revalidateTag(CACHE_TAGS.artist, 'max')` so typos can't create an orphan tag
 * that silently never invalidates anything.
 */
export const CACHE_TAGS = {
  genre: 'genre',
  artist: 'artist',
  album: 'album',
  song: 'song',
  architect: 'architect',
  article: 'article',
  listeningPath: 'listeningPath',
  user: 'user',
  mediaItem: 'mediaItem',
  settings: 'settings',
  heroVideo: 'heroVideo',
} as const;

// 5 minutes — a safety net for tag invalidation. Admin writes bust tags
// immediately, so this upper bound rarely matters; it just guarantees that
// a forgotten revalidateTag somewhere can't serve truly stale content for
// hours on end.
const FIVE_MINUTES = 300;

// ---------------------------------------------------------------------------
// Genre
// ---------------------------------------------------------------------------

/** Full main-genre listing with subgenres and artist counts. */
export const listMainGenresWithChildren = unstable_cache(
  async () =>
    prisma.genre.findMany({
      where: { parentId: null },
      include: {
        children: { orderBy: { nameTr: 'asc' } },
        _count: { select: { artists: true } },
      },
      orderBy: { order: 'asc' },
    }),
  ['genres', 'main-with-children'],
  { tags: [CACHE_TAGS.genre], revalidate: FIVE_MINUTES },
);

/** First 8 main genres for the home page's genre scroller. */
export const listHomeGenres = unstable_cache(
  async () =>
    prisma.genre.findMany({
      where: { parentId: null },
      orderBy: { order: 'asc' },
      take: 8,
    }),
  ['genres', 'home-8'],
  { tags: [CACHE_TAGS.genre], revalidate: FIVE_MINUTES },
);

/** Count of main genres — shown on the home's "View all" endcard. */
export const countMainGenres = unstable_cache(
  async () => prisma.genre.count({ where: { parentId: null } }),
  ['genres', 'count-main'],
  { tags: [CACHE_TAGS.genre], revalidate: FIVE_MINUTES },
);

// ---------------------------------------------------------------------------
// Artist
// ---------------------------------------------------------------------------

/** Full artist listing with genres + album count for /artist. */
export const listAllArtistsWithRelations = unstable_cache(
  async () =>
    prisma.artist.findMany({
      include: {
        genres: { include: { genre: true } },
        _count: { select: { albums: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ['artists', 'all-with-relations'],
  { tags: [CACHE_TAGS.artist], revalidate: FIVE_MINUTES },
);

/** 10 most-recent artists for the home page's artist rail. */
export const listHomeArtists = unstable_cache(
  async () =>
    prisma.artist.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { genres: { include: { genre: true } } },
    }),
  ['artists', 'home-10'],
  { tags: [CACHE_TAGS.artist], revalidate: FIVE_MINUTES },
);

// ---------------------------------------------------------------------------
// Album
// ---------------------------------------------------------------------------

/** Curated featured albums for the home page. */
export const listHomeFeaturedAlbums = unstable_cache(
  async () =>
    prisma.album.findMany({
      where: { featuredOrder: { not: null } },
      take: 6,
      orderBy: { featuredOrder: 'asc' },
      include: { artist: { select: { name: true, slug: true } } },
    }),
  ['albums', 'home-featured'],
  { tags: [CACHE_TAGS.album], revalidate: FIVE_MINUTES },
);

// ---------------------------------------------------------------------------
// Architect
// ---------------------------------------------------------------------------

/** Full architect listing with connected-artist counts for /architects. */
export const listAllArchitectsWithCounts = unstable_cache(
  async () =>
    prisma.architect.findMany({
      include: { _count: { select: { artists: true } } },
      orderBy: { name: 'asc' },
    }),
  ['architects', 'all-with-counts'],
  { tags: [CACHE_TAGS.architect], revalidate: FIVE_MINUTES },
);

// ---------------------------------------------------------------------------
// Article
// ---------------------------------------------------------------------------

/** Editor-curated featured articles for the home page. */
export const listHomeFeaturedArticles = unstable_cache(
  async () =>
    prisma.article.findMany({
      where: { status: 'PUBLISHED', featuredOrder: { not: null } },
      take: 6,
      orderBy: { featuredOrder: 'asc' },
      include: { author: { select: { name: true } } },
    }),
  ['articles', 'home-featured'],
  { tags: [CACHE_TAGS.article], revalidate: FIVE_MINUTES },
);

/** Fallback: 6 most-recent published articles, used when nothing curated. */
export const listHomeFallbackArticles = unstable_cache(
  async () =>
    prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      take: 6,
      orderBy: { publishedAt: 'desc' },
      include: { author: { select: { name: true } } },
    }),
  ['articles', 'home-fallback'],
  { tags: [CACHE_TAGS.article], revalidate: FIVE_MINUTES },
);

/**
 * Articles filtered by category, used by /theory and /ai-music.
 * `category` is the Prisma enum value as a string; it participates in
 * the cache key so each category gets its own cache slot.
 */
export const listPublishedArticlesByCategory = unstable_cache(
  async (category: string) =>
    prisma.article.findMany({
      where: {
        // Safe cast: callers pass valid Prisma enum string literals. An
        // invalid value returns zero rows, not a crash.
        category: category as never,
        status: 'PUBLISHED',
      },
      include: { author: { select: { name: true } } },
      orderBy: { publishedAt: 'desc' },
    }),
  ['articles', 'by-category'],
  { tags: [CACHE_TAGS.article], revalidate: FIVE_MINUTES },
);

// ---------------------------------------------------------------------------
// Listening paths
// ---------------------------------------------------------------------------

/** Full listening-path listing with item counts for /listening-paths. */
export const listAllListeningPathsWithCounts = unstable_cache(
  async () =>
    prisma.listeningPath.findMany({
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ['listening-paths', 'all-with-counts'],
  { tags: [CACHE_TAGS.listeningPath], revalidate: FIVE_MINUTES },
);

/** 4 most-recent listening paths for the home page. */
export const listHomeListeningPaths = unstable_cache(
  async () =>
    prisma.listeningPath.findMany({ take: 4, orderBy: { createdAt: 'desc' } }),
  ['listening-paths', 'home-4'],
  { tags: [CACHE_TAGS.listeningPath], revalidate: FIVE_MINUTES },
);

// ---------------------------------------------------------------------------
// Site settings + hero videos
// ---------------------------------------------------------------------------

/**
 * All site settings in one shot. The home page, the layout header, and
 * a handful of other pages all materialize a `key → value` map out of
 * this — caching at the DB layer means every consumer hits the same
 * entry instead of re-querying.
 */
export const listAllSiteSettings = unstable_cache(
  async () => prisma.siteSetting.findMany(),
  ['settings', 'all'],
  { tags: [CACHE_TAGS.settings], revalidate: FIVE_MINUTES },
);

/** Active hero videos, ordered, for the home carousel. */
export const listActiveHeroVideos = unstable_cache(
  async () =>
    prisma.heroVideo.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: { id: true, url: true, duration: true },
    }),
  ['hero-videos', 'active'],
  { tags: [CACHE_TAGS.heroVideo], revalidate: FIVE_MINUTES },
);
