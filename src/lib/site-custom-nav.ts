import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';
import { CACHE_TAGS } from '@/lib/db-cache';

/**
 * Extra navbar links from SiteSetting (nav_custom_items JSON blob).
 * Each item: id, labelTr, labelEn, href (absolute or relative + locale),
 * enabled flag. Admin form writes via /api/settings.
 */
export interface CustomNavItem {
  id: string;
  labelTr: string;
  labelEn: string;
  href: string;
  enabled: boolean;
}

export const CUSTOM_NAV_SETTING_KEY = 'nav_custom_items';

/** Narrow `unknown` to a valid CustomNavItem, dropping anything malformed. */
function sanitize(raw: unknown): CustomNavItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : null;
  const labelTr = typeof r.labelTr === 'string' ? r.labelTr.trim() : '';
  const labelEn = typeof r.labelEn === 'string' ? r.labelEn.trim() : '';
  const href = typeof r.href === 'string' ? r.href.trim() : '';
  if (!id || !href) return null;
  // At least one label required.
  if (!labelTr && !labelEn) return null;
  return {
    id,
    labelTr: labelTr || labelEn,
    labelEn: labelEn || labelTr,
    href,
    enabled: r.enabled !== false,
  };
}

export function parseCustomNavJson(value: string | null | undefined): CustomNavItem[] {
  if (!value) return [];
  try {
    const data = JSON.parse(value);
    if (!Array.isArray(data)) return [];
    return data.map(sanitize).filter((x): x is CustomNavItem => x !== null);
  } catch {
    return [];
  }
}

/**
 * DB read persisted across requests via `unstable_cache` (tag: `settings`).
 * Admin nav writes call `revalidateTag('settings')` so new items surface
 * on the next public request. Without this, the layout's call to
 * getCustomNavItems() fell to DB on every request and forced every public
 * page out of ISR.
 */
const loadCustomNavItems = unstable_cache(
  async (): Promise<CustomNavItem[]> => {
    const row = await prisma.siteSetting.findUnique({
      where: { key: CUSTOM_NAV_SETTING_KEY },
    });
    return parseCustomNavJson(row?.value);
  },
  ['custom-nav-items'],
  { tags: [CACHE_TAGS.settings], revalidate: 300 },
);

/**
 * Load custom nav items for the public site. React `cache` on top of
 * `unstable_cache` dedupes within a single render pass (layout + page).
 */
export const getCustomNavItems = cache(loadCustomNavItems);

/** Treat `http://` and `https://` as external — those should not be locale-prefixed. */
export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/**
 * Resolve a custom item's href for a given locale.
 *   - External URLs (http/https) pass through.
 *   - Relative paths already beginning with `/tr/` or `/en/` pass through.
 *   - Other relative paths get the current locale prefixed (`/listening-paths` → `/tr/listening-paths`).
 */
export function resolveCustomHref(href: string, locale: string): string {
  if (isExternalHref(href)) return href;
  if (!href.startsWith('/')) return `/${locale}/${href.replace(/^\/+/, '')}`;
  if (href.startsWith(`/${locale}/`) || href === `/${locale}`) return href;
  if (/^\/(tr|en)(\/|$)/.test(href)) return href; // other locale; leave as-is
  return `/${locale}${href}`;
}
