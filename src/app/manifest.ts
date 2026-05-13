import type { MetadataRoute } from 'next';

/**
 * Web App Manifest. Auto-linked by Next.js; theme_color drives mobile
 * browser chrome. Lighthouse PWA testindeki ikon kuralları için 192×192
 * ve 512×512 PNG'leri açıkça tanıtılıyor — bu route'lar dinamik (src/app/
 * icon.tsx ve apple-icon.tsx, ileride icon-large.tsx eklenebilir).
 *
 * `purpose: 'maskable'`: Android adaptive icon framework'üne "bu ikonu
 * istediğin gibi kırp" izni — kenarlar tamamen padding olarak tasarlandı.
 * Ayrı bir maskable PNG dosyası henüz yok; aynı dinamik route'u
 * `purpose: 'any maskable'` ile vermek geçici çözüm.
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
      {
        // src/app/icon.tsx — 192×192 PNG dinamik üretilir.
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        // Aynı 192 PNG'yi maskable purpose'ında da tanıt — Android
        // adaptive icon framework'üne padding'i kırpma izni. Ayrı bir
        // maskable-safe PNG yapılana kadar yeterli yaklaşım.
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        // src/app/icon1.tsx — 512×512, Android PWA install için zorunlu.
        // Next file-based metadata convention: `icon{N}.tsx` → `/icon{N}`.
        src: '/icon1',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon1',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        // src/app/apple-icon.tsx — 180×180, iOS "Ana ekrana ekle" akışı.
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
