import type { MetadataRoute } from 'next';

/**
 * Web App Manifest.
 *
 * Served at `/manifest.webmanifest` and linked automatically by Next.js
 * from every page's `<head>`. Even if we never ship a full PWA, Lighthouse
 * dings sites that omit one, and the `theme_color` drives the browser
 * chrome tint on mobile Chrome / Android installs.
 *
 * Icons: we only reference `/favicon.ico` here. When we add a proper
 * 192/512 set under `src/app/icon.png` / `apple-icon.png`, Next.js picks
 * them up via file-based conventions and exposes them through the
 * manifest automatically.
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
    // Locales cycle through TR + EN at the route level; the manifest
    // itself defaults to TR because that's the primary audience.
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
