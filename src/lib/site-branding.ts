import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';
import { CACHE_TAGS } from '@/lib/db-cache';

/**
 * Super-admin tarafından yönetilen marka kimliği: logo görselleri ve
 * site adı. SiteSetting key-value tablosunda tutulur ve tüm public
 * sayfalarda (Navbar + Footer) kullanılır.
 *
 * Keys:
 *   - site_logo_url:        Header ve (fallback olarak) Footer logosu.
 *                           Koyu arka plan üzerinde okunabilecek bir görsel
 *                           olmalı (beyaz/açık renk logo tercih edilir).
 *   - site_logo_footer_url: Opsiyonel ayrı footer logosu. Boşsa header
 *                           logosu kullanılır.
 *   - site_name:            Logonun yanında/altında görünen metin. Boşsa
 *                           varsayılan "Beyond The Music" kullanılır.
 *
 * Settings cache tag'i (`settings`) zaten `/api/settings` PUT'unda
 * `revalidateTag` ile temizleniyor — buradaki okuma otomatik olarak
 * tazelenir, ek bir kablolama gerekmez.
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
