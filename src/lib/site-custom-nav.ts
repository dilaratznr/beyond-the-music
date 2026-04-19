import { cache } from 'react';
import prisma from '@/lib/prisma';

/**
 * Super-admin-defined extra navbar links, stored as a single JSON blob in
 * SiteSetting (key `nav_custom_items`). Each row has:
 *   - id:      stable identifier (used as React key + in admin UI updates)
 *   - labelTr: Turkish label
 *   - labelEn: English label
 *   - href:    absolute URL (http(s)://…) OR a relative path (/genre, /x/y).
 *              Relative paths are auto-prefixed with the active locale at
 *              render time — entering "/listening-paths" becomes "/tr/listening-paths".
 *   - enabled: can be toggled off without deleting.
 *
 * The admin form writes the same JSON back through `/api/settings`.
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
  // At least one label is required so there's something to show.
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
 * Load custom nav items for the public site. Deduped per-request via
 * React `cache` so calling from both the layout and any page is free.
 */
export const getCustomNavItems = cache(async (): Promise<CustomNavItem[]> => {
  const row = await prisma.siteSetting.findUnique({
    where: { key: CUSTOM_NAV_SETTING_KEY },
  });
  return parseCustomNavJson(row?.value);
});

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
