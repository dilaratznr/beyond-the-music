/**
 * Site-wide iletişim ve sosyal medya bilgileri.
 *
 * Hardcoded değerler yerine burada tek noktadan yönetilir. Env değişkeni
 * tanımlıysa onu kullanır, yoksa fallback değere düşer. Böylece:
 *   - Dev ortamında ek ayar gerekmez, her şey çalışır.
 *   - Production'da mail/telefon/sosyal hesaplar `.env`'den override edilir,
 *     kod değişikliği gerekmez.
 *
 * NEXT_PUBLIC_ ön eki zorunlu — client component'lerde (örn. contact
 * formu) okunabilmesi için. Bu değerler public olduğu için sakıncası yok.
 */

export const SITE_CONTACT = {
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'themusicbeyondtr@gmail.com',
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '+905374225708',
  phoneDisplay:
    process.env.NEXT_PUBLIC_CONTACT_PHONE_DISPLAY || '0 537 422 57 08',
  addressName: process.env.NEXT_PUBLIC_CONTACT_ADDRESS_NAME || 'Fade Stage',
  addressLine:
    process.env.NEXT_PUBLIC_CONTACT_ADDRESS ||
    'Cinnah Cd. Farabi Sk. 39/A, Çankaya/Ankara',
} as const;

export interface SocialLink {
  name: string;
  url: string;
}

/**
 * Boş URL'li girdileri filtreler — env'de set edilmemiş platformlar UI'da
 * gözükmez (ölü link yerine hiç basmamak daha iyi).
 */
export const SOCIAL_LINKS: SocialLink[] = [
  {
    name: 'Instagram',
    url: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || '',
  },
  {
    name: 'YouTube',
    url: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE || '',
  },
  {
    name: 'Spotify',
    url: process.env.NEXT_PUBLIC_SOCIAL_SPOTIFY || '',
  },
].filter((s) => s.url.length > 0);
