import { ImageResponse } from 'next/og';

/**
 * Apple touch icon — iOS Safari "Ana ekrana ekle" akışında ve sayfa
 * favicon'unda kullanılır. Next.js dosya bazlı convention: bu dosya
 * `/apple-icon` route'unda 180×180 PNG döner ve <link rel="apple-touch-
 * icon"> meta tag'ini otomatik inject eder.
 *
 * Programmatic generation — gerçek bir tasarım PNG'si yokken yeterli
 * bir fallback. Tasarımcı `/public/apple-icon.png` (180×180) atınca
 * Next.js önceliği file-system convention'a verir; bu dosyayı silmek
 * gerekmez ama atılan dosya öncelikli olur.
 */

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, #18181b 0%, #0a0a0b 60%, #09090b 100%)',
          borderRadius: 36,
        }}
      >
        {/* Editorial monogram — "BTM" big, tracked, white. */}
        <div
          style={{
            color: '#ffffff',
            fontSize: 72,
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            display: 'flex',
          }}
        >
          BTM
        </div>
        <div
          style={{
            marginTop: 8,
            color: '#71717a',
            fontSize: 11,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            fontWeight: 700,
            display: 'flex',
          }}
        >
          beyond
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
