'use client';

import { useState } from 'react';

/**
 * Card image with character-watermark fallback (gradient + letter).
 * Fallback always in background; image layers on top. Hides broken-image icon.
 */

interface CardImageProps {
  src?: string | null;
  letter: string;       // Fallback watermark character
  alt?: string;
  gradientClass?: string;  // Override fallback gradient (default: neutral dark)
  imgClassName?: string;   // Extra classes for image (opacity, hover, etc.)
}

// Radial spot position deterministic per letter; 26 variations via hash.
const SPOT_POSITIONS = [
  '20% 25%',
  '78% 20%',
  '30% 78%',
  '72% 72%',
  '50% 30%',
  '50% 75%',
  '22% 55%',
  '80% 50%',
];
function spotForLetter(letter: string): string {
  const code = letter.toUpperCase().charCodeAt(0) || 0;
  return SPOT_POSITIONS[code % SPOT_POSITIONS.length];
}

export function CardImage({
  src,
  letter,
  alt = '',
  gradientClass = 'from-zinc-800 to-zinc-950',
  imgClassName = 'opacity-60 group-hover:opacity-90 transition-opacity duration-500',
}: CardImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;
  const spot = spotForLetter(letter || '♪');

  return (
    <>
      {/* Fallback — her zaman render, görsel üstüne biniyor. Görsel
          yüklenemezse (null src, 404, kırık URL) ortaya çıkıyor.
          Görselsiz kayıtlar için düz bir gradient+harf yerine
          3 katmanlı, üretilmiş-kapak hissi veren bir fallback:
            1) Ana gradient (slug hash'iyle renk seçilmiş)
            2) Harfe göre değişen radial spotlight (sanki ışık düşmüş gibi)
            3) Hafif çapraz tarama — editoryel doku, düz alan hissini
               kırıyor. */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at ${spot}, rgba(255,255,255,0.12), transparent 55%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent 0 22px, rgba(255,255,255,1) 22px 23px)',
          }}
        />
        {/* Eskiden burada büyük harf fallback'i (letter) gözüküyordu;
            kartlardaki tek-harf watermark editoryal tona uymadığı için
            kaldırıldı. Artık sadece gradient + radial spotlight +
            çapraz tarama; görsel daha sade. */}
      </div>

      {showImage && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={`absolute inset-0 w-full h-full object-cover ${imgClassName}`}
        />
      )}
    </>
  );
}

export default CardImage;
