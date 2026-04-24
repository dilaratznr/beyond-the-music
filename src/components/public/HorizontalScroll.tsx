'use client';

import { useRef, useEffect, useLayoutEffect, useState } from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

/**
 * "Pin + translate" yatay kaydırma.
 *
 * Perf not: translate değerini React state'te tutmuyoruz — her scroll
 * frame'de re-render ağır kaçıyordu. Bunun yerine ref üzerinden doğrudan
 * `element.style.transform` yazıyoruz. rAF ile throttled.
 *
 * Dikey hizalama (Dilara geri bildirimi: "kaydirirken alti cok bos duruyor"):
 * Sticky alanı `h-screen` (viewport) tutuyoruz — aksi halde viewport'un
 * kalan kısmı "sticky altı" boşluğu olarak siyah kalıyordu. Ancak kartlar
 * `items-start`'ta olunca altta kocaman dead zone oluyordu; çözüm:
 * kartları `items-center` + hafif `-mt` ile yatay ortanın biraz üstüne
 * al. Üst/alt boşluk dengeli, kartlar "optik merkezde" ve scroll pin'i
 * tamamlandığında hemen sonraki section geliyor.
 */
export default function HorizontalScroll({ children, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sectionHeight, setSectionHeight] = useState<number | null>(null);

  // Overflow ölç ve section yüksekliğini ayarla
  useLayoutEffect(() => {
    function measure() {
      const scroll = scrollRef.current;
      if (!scroll) return;
      const overflow = Math.max(0, scroll.scrollWidth - window.innerWidth);
      setSectionHeight(window.innerHeight + overflow);
    }
    measure();
    window.addEventListener('resize', measure);
    // Resimler yüklendikçe genişlik değişebilir — ResizeObserver yakalar
    let ro: ResizeObserver | null = null;
    if ('ResizeObserver' in window && scrollRef.current) {
      ro = new ResizeObserver(measure);
      ro.observe(scrollRef.current);
    }
    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const scroll = scrollRef.current;
    if (!container || !scroll || !sectionHeight) return;

    let rafId = 0;
    function update() {
      rafId = 0;
      const rect = container!.getBoundingClientRect();
      const overflow = Math.max(0, scroll!.scrollWidth - window.innerWidth);
      const scrollRange = sectionHeight! - window.innerHeight;

      let tx = 0;
      if (rect.top >= 0) {
        tx = 0;
      } else if (rect.bottom <= window.innerHeight) {
        tx = overflow;
      } else if (scrollRange > 0) {
        const progress = Math.min(1, Math.max(0, -rect.top / scrollRange));
        tx = progress * overflow;
      }
      // Direkt DOM'a yaz — React re-render yok
      scroll!.style.transform = `translate3d(${-tx}px, 0, 0)`;
    }
    function onScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [sectionHeight]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ height: sectionHeight ? `${sectionHeight}px` : '100vh' }}
    >
      {/* Sticky alan viewport'u tamamen kaplar (h-screen) ki sonraki
          section'ın dışarı taşmasına izin vermesin — ama içerik (kartlar)
          `items-center` ile dikey ortada, `-translate-y-[8vh]` ile
          optik olarak biraz yukarıda dursun (insan gözü tam merkezi
          "aşağı kaymış" algılar, hafif yukarı ofset daha dengeli görünür).
          Başlık sticky'nin dışında, pin aktif olunca zaten yukarı kayıyor. */}
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-5 px-6 lg:px-10 xl:px-14 will-change-transform -translate-y-[6vh]"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
