import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';
import { CACHE_TAGS } from '@/lib/db-cache';

/**
 * Site branding (logo URLs, name) from SiteSetting key-value table.
 * Cached; settings tag invalidation on PUT /api/settings.
 */

export const SITE_BRANDING_KEYS = {
  logoUrl: 'site_logo_url',
  logoFooterUrl: 'site_logo_footer_url',
  name: 'site_name',
} as const;

export interface SiteBranding {
  /** Header logosu (opsiyonel). Boşsa Navbar emoji fallback'i gösterir. */
  logoUrl: string;
  /** Footer logosu. Boşsa Footer header logosuna düşer, o da yoksa emoji. */
  logoFooterUrl: string;
  /** Logonun yanındaki metin. Her zaman bir değer döner (fallback dahil). */
  name: string;
}

export const DEFAULT_SITE_NAME = 'Beyond The Music';

const loadSiteBranding = unstable_cache(
  async (): Promise<SiteBranding> => {
    const rows = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: [
            SITE_BRANDING_KEYS.logoUrl,
            SITE_BRANDING_KEYS.logoFooterUrl,
            SITE_BRANDING_KEYS.name,
          ],
        },
      },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      logoUrl: (map.get(SITE_BRANDING_KEYS.logoUrl) || '').trim(),
      logoFooterUrl: (map.get(SITE_BRANDING_KEYS.logoFooterUrl) || '').trim(),
      name: (map.get(SITE_BRANDING_KEYS.name) || '').trim() || DEFAULT_SITE_NAME,
    };
  },
  ['site-branding'],
  { tags: [CACHE_TAGS.settings], revalidate: 300 },
);

/**
 * Layout + ileri bileşenlerin aynı render turunda tekrar tekrar
 * sorgulamasını engellemek için React `cache` ile sarıldı.
 */
export const getSiteBranding = cache(loadSiteBranding);
