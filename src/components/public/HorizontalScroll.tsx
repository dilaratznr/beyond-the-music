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
 * Spacing evrimi:
 *   1. items-center → items-start: başlık + kartlar arasında ~1 viewport
 *      boşluk oluşuyordu, kartları yukarı çektik.
 *   2. pt-[10vh] → pt-[4vh]: üstteki payı azalttık.
 *   3. (Dilara geri bildirimi: "türler ve sanatçılar arası çok boşluk var")
 *      h-screen pin alanı problemliydi — kartlar ~370px, viewport ~900px,
 *      altta ~500px ölü alan kalıyor ve bir sonraki section'a geçiş geç
 *      hissediliyordu. Şimdi pin yüksekliği içeriğe göre ölçülüyor:
 *      kart yüksekliği + ufak üst/alt nefes. Yatay scroll bitince sıradaki
 *      section hemen geliyor.
 */
const TOP_PAD = 32; // sticky pin üst nefes (px)
const BOTTOM_PAD = 32; // sticky pin alt nefes (px)

export default function HorizontalScroll({ children, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sectionHeight, setSectionHeight] = useState<number | null>(null);
  const [pinHeight, setPinHeight] = useState<number | null>(null);

  // Overflow + pin yüksekliğini ölç
  useLayoutEffect(() => {
    function measure() {
      const scroll = scrollRef.current;
      if (!scroll) return;
      const overflow = Math.max(0, scroll.scrollWidth - window.innerWidth);
      // Pin alanı viewport'un tamamı değil — içerik kadar + nefes.
      // Viewport'tan büyük olmamalı (sticky davranışı bozulur).
      const cardsH = scroll.offsetHeight;
      const pin = Math.min(
        window.innerHeight,
        cardsH + TOP_PAD + BOTTOM_PAD,
      );
      setPinHeight(pin);
      setSectionHeight(pin + overflow);
    }
    measure();
    window.addEventListener('resize', measure);
    // Resimler yüklendikçe boyut değişebilir — ResizeObserver yakalar
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
    if (!container || !scroll || !sectionHeight || !pinHeight) return;

    let rafId = 0;
    function update() {
      rafId = 0;
      const rect = container!.getBoundingClientRect();
      const overflow = Math.max(0, scroll!.scrollWidth - window.innerWidth);
      // Scroll aralığı: section toplam yüksekliği - pin (= overflow kadar)
      const scrollRange = sectionHeight! - pinHeight!;

      let tx = 0;
      if (rect.top >= 0) {
        tx = 0;
      } else if (rect.bottom <= pinHeight!) {
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
  }, [sectionHeight, pinHeight]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ height: sectionHeight ? `${sectionHeight}px` : 'auto' }}
    >
      <div
        className="sticky top-0 overflow-hidden flex items-start"
        style={{
          height: pinHeight ? `${pinHeight}px` : 'auto',
          paddingTop: `${TOP_PAD}px`,
          paddingBottom: `${BOTTOM_PAD}px`,
        }}
      >
        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-5 px-6 lg:px-10 xl:px-14 will-change-transform"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
