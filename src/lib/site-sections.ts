import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';
import { CACHE_TAGS } from '@/lib/db-cache';

/**
 * Public nav sections that the super admin can enable/disable.
 * The home page is intentionally not togglable — every site needs a home.
 *
 * Each section maps to:
 *   - key: stable identifier used in SiteSetting keys and URL paths
 *   - settingKey: the key in SiteSetting ("section_<key>_enabled")
 *   - labelKey: path inside dict (dot-separated) for i18n label
 *   - href: URL path segment under /[locale]
 */
export const PUBLIC_SECTIONS = [
  { key: 'genre', settingKey: 'section_genre_enabled', labelKey: 'nav.genre', href: '/genre' },
  { key: 'artist', settingKey: 'section_artist_enabled', labelKey: 'nav.artist', href: '/artist' },
  { key: 'article', settingKey: 'section_article_enabled', labelKey: 'nav.article', href: '/article' },
  { key: 'architects', settingKey: 'section_architects_enabled', labelKey: 'nav.architects', href: '/architects' },
  { key: 'theory', settingKey: 'section_theory_enabled', labelKey: 'nav.theory', href: '/theory' },
  { key: 'listeningPaths', settingKey: 'section_listening_paths_enabled', labelKey: 'nav.listeningPaths', href: '/listening-paths' },
  { key: 'aiMusic', settingKey: 'section_ai_music_enabled', labelKey: 'nav.aiMusic', href: '/ai-music' },
] as const;

export type PublicSection = (typeof PUBLIC_SECTIONS)[number];
export type PublicSectionKey = PublicSection['key'];

/**
 * DB read wrapped in `unstable_cache`:
 *   - Persists across requests (tagged with `settings`).
 *   - Admin settings writes should call `revalidateTag('settings')` so
 *     nav visibility updates on the very next request.
 */
const loadSectionEnabledMap = unstable_cache(
  async (): Promise<Record<string, boolean>> => {
    const rows = await prisma.siteSetting.findMany({
      where: {
        key: { in: PUBLIC_SECTIONS.map((s) => s.settingKey) },
      },
    });
    const map: Record<string, boolean> = {};
    for (const s of PUBLIC_SECTIONS) {
      const row = rows.find((r) => r.key === s.settingKey);
      // default-enabled: only "false" (string) disables. Everything else —
      // including missing rows — counts as on.
      map[s.key] = row ? row.value !== 'false' : true;
    }
    return map;
  },
  ['site-sections', 'enabled-map'],
  { tags: [CACHE_TAGS.settings], revalidate: 300 },
);

/**
 * Load the enabled/disabled state for every togglable section.
 * Missing rows default to enabled — fresh installs show every section
 * until the admin explicitly disables one.
 *
 * Wrapped in React's `cache` to dedupe within a single request (layout +
 * page would otherwise both materialize the map), on top of the
 * cross-request `unstable_cache` below.
 */
export const getSectionEnabledMap = cache(loadSectionEnabledMap);

/**
 * Throw notFound() from a public page if its section has been disabled
 * by the super admin. Kept off the hot path by short-circuiting for
 * unknown keys (never disable something we don't know about).
 */
export async function isSectionEnabled(key: PublicSectionKey): Promise<boolean> {
  const map = await getSectionEnabledMap();
  return map[key] ?? true;
}
