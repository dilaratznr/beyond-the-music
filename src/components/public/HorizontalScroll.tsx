'use client';

import { useRef, useEffect, useState, useLayoutEffect } from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

/**
 * "Pin + translate" yatay kaydırma: section dikey olarak uzun bir konteyner
 * olur, içindeki sıra sticky pozisyonda kalır ve sayfa scroll'una bağlı
 * olarak X ekseninde kayar. Kullanıcı sayfayı aşağı kaydırınca kartlar
 * yana kendi kendine kayıyor gibi hissedilir.
 *
 * Section yüksekliği DİNAMİK: içeriğin gerçek overflow miktarına göre
 * hesaplanır, böylece 1:1 oran (1px dikey scroll = 1px yatay kayma).
 * Daha önce sabit 300vh idi — az içerik varken bile 2 ekran boyu dead-zone
 * oluyordu; şimdi içerik kadar kaydırma alanı kalır.
 */
export default function HorizontalScroll({ children, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollX, setScrollX] = useState(0);
  const [sectionHeight, setSectionHeight] = useState<number | null>(null);

  // Overflow miktarını ölç (mount + resize) → section height'i buna göre ayarla.
  useLayoutEffect(() => {
    function measure() {
      const scroll = scrollRef.current;
      if (!scroll) return;
      const overflow = Math.max(0, scroll.scrollWidth - window.innerWidth);
      // Hızı biraz yavaşlatmak için overflow * 1.1 + viewport ekliyoruz —
      // tam 1:1 biraz sert hissettiriyordu.
      setSectionHeight(window.innerHeight + overflow * 1.1);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const scroll = scrollRef.current;
    if (!container || !scroll || !sectionHeight) return;

    let rafId = 0;
    function onScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const rect = container!.getBoundingClientRect();
        const overflow = Math.max(0, scroll!.scrollWidth - window.innerWidth);
        const scrollRange = sectionHeight! - window.innerHeight;

        // Section viewport'ta değilken translate sıfırda kalsın
        if (rect.top >= 0) {
          setScrollX(0);
          return;
        }
        if (rect.bottom <= window.innerHeight) {
          setScrollX(overflow);
          return;
        }

        const progress = Math.min(1, Math.max(0, -rect.top / scrollRange));
        setScrollX(progress * overflow);
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
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
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-5 px-6"
          style={{
            transform: `translate3d(-${scrollX}px, 0, 0)`,
            willChange: 'transform',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
