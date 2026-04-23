import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/**
 * Static CSP for the public site, pre-built at module load.
 *
 * We emit it via `headers()` here instead of from the edge middleware so
 * the public locale routes don't touch the middleware at all — any
 * matcher hit makes Vercel treat the response as dynamic, which kills
 * ISR caching. The strict nonce-based policy still lives in
 * `src/proxy.ts` and is applied only to `/admin/*` pages (see the
 * matcher at the bottom of that file).
 */
const PUBLIC_CSP = [
  "default-src 'self'",
  // No nonce / no strict-dynamic here. Next's inline hydration scripts
  // need 'unsafe-inline' to run without a per-request nonce; remote
  // origins are still blocked by 'self'.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://generativelanguage.googleapis.com",
  "frame-src 'self' https://www.youtube.com https://youtube.com https://open.spotify.com",
  "media-src 'self' https: blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
    // Modern format tercih et — tarayıcı destekliyorsa AVIF/WebP
    // sunulur, orijinal dosyaya göre ~%30-70 daha küçük.
    formats: ['image/avif', 'image/webp'],
    // Uzak görselleri 1 gün kenar cache'inde tut.
    minimumCacheTTL: 86400,
  },
  // Production build'de kaynak haritası yok → küçük bundle.
  productionBrowserSourceMaps: false,
  async headers() {
    // Note: per-request CSP for `/admin/*` (with a fresh nonce) is
    // intentionally set from src/proxy.ts. The static CSP below only
    // covers the public surface, where ISR caching matters.
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // Public locale-prefixed pages get the static CSP. Their routes
        // bypass the edge middleware entirely (see matcher in proxy.ts),
        // so Vercel can serve them from its ISR cache.
        source: '/:locale(tr|en)/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: PUBLIC_CSP },
        ],
      },
      {
        // Locale landing pages themselves (/tr, /en) also need the CSP.
        source: '/:locale(tr|en)',
        headers: [
          { key: 'Content-Security-Policy', value: PUBLIC_CSP },
        ],
      },
      {
        // Content-addressed uploads (hash-in-filename, produced by
        // src/lib/image-processing.ts). The filename CHANGES when the
        // image content changes, so the URL itself acts as the cache
        // buster — we can safely tell the browser + any intermediate
        // CDN to cache forever.
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
