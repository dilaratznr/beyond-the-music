/**
 * Contact & social links (env override or fallback). NEXT_PUBLIC_ required
 * for client-side access. Public data, no secrets.
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

/** Filter empty URLs (hide unset platforms instead of dead links). */
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
