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

export function CardImage({
  src,
  letter,
  alt = '',
  gradientClass = 'from-zinc-800 to-zinc-950',
  imgClassName = 'opacity-60 group-hover:opacity-90 transition-opacity duration-500',
}: CardImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;

  return (
    <>
      {/* Fallback — her zaman render, görsel üstüne biniyor. Görsel
          yüklenemezse ortaya çıkıyor. */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`} aria-hidden="true">
        <span
          className="absolute inset-0 flex items-center justify-center font-editorial font-black text-white/15 select-none leading-none"
          style={{ fontSize: 'clamp(3rem, 10vw, 6rem)' }}
        >
          {letter.toUpperCase()}
        </span>
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
