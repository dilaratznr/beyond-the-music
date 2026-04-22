import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

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
    // Note: Content-Security-Policy is intentionally set per-request in
    // src/proxy.ts so it can include a fresh nonce on every render. Keep
    // non-nonce security headers here.
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
