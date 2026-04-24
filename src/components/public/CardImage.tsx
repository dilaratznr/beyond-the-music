'use client';

import { useState } from 'react';

/**
 * Görsel kart'ı — resim yoksa VEYA yüklenemezse (kırık URL, 404, CSP
 * bloğu, network kesik) karakter-watermark fallback'ini gösterir.
 *
 * Dilara geri bildirimi: admin'den görsel girilmemiş türlerde iPhone
 * Safari bozuk resim ikonu ("?") basıyordu; "olmayan görseller var
 * onlara da bir şey koy". Çözüm:
 *   1. Fallback (gradient + büyük harf) hep arka plan olarak render
 *   2. Görsel yüklenirse onun üzerine binsin
 *   3. onError tetiklenirse görsel tamamen DOM'dan kaldırılır → fallback
 *      görünür kalır (browser'ın default broken-image ikonu
 *      asla görünmez)
 *
 * Kullanım:
 *   <CardImage src={g.image} letter={name.charAt(0)} alt="" />
 */

interface CardImageProps {
  src?: string | null;
  /** Fallback'te watermark olarak basılan karakter (genelde isim ilk harfi) */
  letter: string;
  alt?: string;
  /** "gradient-to-br from-zinc-800 to-zinc-950" gibi; her kart için
   *  farklı renk palet istersek üstten geçeriz. Default: nötr koyu. */
  gradientClass?: string;
  /** Görsel için ek class (opacity, hover efekt vs.) */
  imgClassName?: string;
  /** Kart ebadı için dış kap'lar ayarlar; biz iç katmanları 100%
   *  dolduruyoruz. */
}

// Fallback'in radial spot pozisyonu harfi hash'lemekle belirleniyor —
// her kart aynı harfte aynı görüntüyü alıyor, ama A/B/C farklı köşeden
// ışık alıyor. Sonuç: 26 farklı "üretilmiş" kapak hissi, düz bir
// letter-on-gradient yerine.
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
          Dilara "bazi seylerde gorsel yok, onlara da gorsel koysun ai
          koyar" geri bildirimine karşılık düz bir gradient+harf yerine
          3 katmanlı üretilmiş-kapak hissi veriyoruz:
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
        {/* Eskiden burada büyük harf fallback'i (letter) gözüküyordu —
            Dilara: "kartlardaki harfleri kaldır". Artık sadece gradient
            + radial spotlight + çapraz tarama; görsel daha sade. */}
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
