import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';
import { CACHE_TAGS } from '@/lib/db-cache';

/**
 * Site iletişim bilgileri ve sosyal linkleri SiteSetting tablosundan
 * okur. Tüm alanlar Super Admin tarafından panelden yönetilir; env
 * fallback yok — boş bırakılan alan UI'da görünmez.
 *
 * Cache settings tag'ine bağlı: PUT /api/settings invalide eder.
 */

export const SITE_CONTACT_KEYS = {
  email: 'contact_email',
  phone: 'contact_phone',
  phoneDisplay: 'contact_phone_display',
  addressName: 'contact_address_name',
  addressLine: 'contact_address_line',
  socialInstagram: 'social_instagram',
  socialYoutube: 'social_youtube',
  socialSpotify: 'social_spotify',
  socialTwitter: 'social_twitter',
  socialTiktok: 'social_tiktok',
} as const;

export interface SiteContact {
  email: string;
  /** Tel: linki için ham numara (boş ise telefon hiç render edilmez). */
  phone: string;
  /** Kullanıcıya gösterilen biçim, ör. "0 537 422 57 08". */
  phoneDisplay: string;
  addressName: string;
  addressLine: string;
}

export interface SocialLink {
  name: string;
  url: string;
}

const SOCIAL_PLATFORMS: Array<{
  key: keyof typeof SITE_CONTACT_KEYS;
  name: string;
}> = [
  { key: 'socialInstagram', name: 'Instagram' },
  { key: 'socialYoutube', name: 'YouTube' },
  { key: 'socialSpotify', name: 'Spotify' },
  { key: 'socialTwitter', name: 'X' },
  { key: 'socialTiktok', name: 'TikTok' },
];

const loadSiteContact = unstable_cache(
  async (): Promise<{ contact: SiteContact; social: SocialLink[] }> => {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: Object.values(SITE_CONTACT_KEYS) } },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));

    const get = (k: keyof typeof SITE_CONTACT_KEYS) =>
      (map.get(SITE_CONTACT_KEYS[k]) || '').trim();

    const contact: SiteContact = {
      email: get('email'),
      phone: get('phone'),
      phoneDisplay: get('phoneDisplay') || get('phone'),
      addressName: get('addressName'),
      addressLine: get('addressLine'),
    };

    // Boş URL'li platformları gizle — kırık linkten iyidir.
    const social: SocialLink[] = SOCIAL_PLATFORMS.map((p) => ({
      name: p.name,
      url: get(p.key),
    })).filter((s) => s.url.length > 0);

    return { contact, social };
  },
  ['site-contact'],
  { tags: [CACHE_TAGS.settings], revalidate: 300 },
);

/**
 * Aynı render turunda tekrar tekrar sorgulanmasın — Footer ve contact
 * sayfası ikisi de aynı request içinde okuyabiliyor.
 */
export const getSiteContact = cache(loadSiteContact);
