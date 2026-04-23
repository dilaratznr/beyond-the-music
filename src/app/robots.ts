import type { MetadataRoute } from 'next';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://beyondthemusic.app';

/**
 * Robots policy.
 *
 * - `/uploads/` is intentionally ALLOWED so Google Images can index our
 *   cover art / hero imagery — this drives real discovery traffic to
 *   artist and album pages.
 * - `/admin` and `/api` stay blocked. Nothing indexable lives there.
 * - `host` is deliberately omitted; it was a Yandex-era directive that
 *   modern Google ignores, and mis-configured values can confuse bots.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/uploads/'],
        disallow: ['/admin', '/api'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
