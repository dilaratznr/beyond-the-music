import type { MetadataRoute } from 'next';

/**
 * Web App Manifest. Auto-linked by Next.js; theme_color drives mobile
 * browser chrome. Icons auto-discovered from src/app/icon.png conventions.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Beyond The Music — Müzik Platformu',
    short_name: 'Beyond The Music',
    description:
      'Müziğin ötesindeki kültürü keşfeden platform. Türler, sanatçılar, mimarlar, teori ve dinleme rotaları.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0b',
    theme_color: '#0a0a0b',
    // Default to TR (primary audience); routes cycle TR/EN.
    lang: 'tr',
    dir: 'ltr',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
