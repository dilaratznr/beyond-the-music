import { ImageResponse } from 'next/og';

/**
 * PWA icon — manifest.json'da 192x192 size'la referans verilir, ayrıca
 * favicon olarak da kullanılır. Next.js file-based convention: bu dosya
 * `/icon` route'undan PNG döner ve `<link rel="icon">` meta tag'ini
 * otomatik inject eder.
 *
 * Tasarım: apple-icon.tsx ile aynı dil — BTM monogramı + "beyond" overlay.
 * Programmatic; gerçek PNG asset hazır olunca `/public/icon.png` overrider.
 *
 * Boyut 192×192 → Lighthouse PWA testindeki "icons need 192x192" kuralını
 * karşılar. 512x512 için `src/app/icon-large.tsx` ayrı.
 */

export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: 40,
        }}
      >
        <div
          style={{
            color: '#ffffff',
            fontSize: 76,
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
