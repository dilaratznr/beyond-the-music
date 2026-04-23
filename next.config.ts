import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    // Güvenlik notu: Önceden `hostname: '**'` idi — Next'in image
    // optimization servisi arbitrary HTTPS URL'leri fetch edip
    // transform ediyordu (SSRF + DoS riski). Şu an sadece gerçekten
    // kullanılan host'lar allowlist'te. Yeni bir görsel kaynağı
    // eklenecekse buraya açıkça eklenmeli.
    remotePatterns: [
      // Editoryel stok görseller — homepage fallback'leri
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Cloudflare R2 public domain'i — production'da
      // NEXT_PUBLIC_IMAGE_DOMAIN olarak set ediliyor (ör: cdn.example.com)
      ...(process.env.NEXT_PUBLIC_IMAGE_DOMAIN
        ? [{ protocol: 'https' as const, hostname: process.env.NEXT_PUBLIC_IMAGE_DOMAIN }]
        : []),
      // R2 default public URL'leri (bucket özel domain atanmadıysa)
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.r2.dev' },
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
          // HSTS — tarayıcıya "bu siteyi bir daha HTTPS dışı yükleme"
          // diyor. 1 yıl + subdomain'ler dahil + preload list'e hazır.
          // preload için önce siteyi hstspreload.org'a göndermek gerek.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
