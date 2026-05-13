import { ImageResponse } from 'next/og';

/**
 * 512×512 PWA icon — Android'in "Ana ekrana ekle" akışında istenilen
 * boyut. Next dosya bazlı metadata convention: `icon{N}.tsx` formatında
 * isimlendirilmiş dosyalar `/icon{N}` route'unda servis edilir, ayrıca
 * `<link rel="icon">` olarak head'e otomatik eklenir. icon.tsx 192'yi,
 * bu dosya 512'yi karşılar.
 *
 * Aynı tasarım dili (icon.tsx), scale up.
 */

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function IconLarge() {
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
          borderRadius: 108,
        }}
      >
        <div
          style={{
            color: '#ffffff',
            fontSize: 200,
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
            marginTop: 24,
            color: '#71717a',
            fontSize: 28,
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
