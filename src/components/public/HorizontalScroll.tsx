'use client';

import { useRef, useEffect, useState } from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export default function HorizontalScroll({ children, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollX, setScrollX] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const scroll = scrollRef.current;
    if (!container || !scroll) return;

    function onScroll() {
      const rect = container!.getBoundingClientRect();
      const scrollWidth = scroll!.scrollWidth - window.innerWidth;
      const containerHeight = container!.offsetHeight - window.innerHeight;

      if (rect.top <= 0 && rect.bottom >= window.innerHeight) {
        const progress = Math.abs(rect.top) / containerHeight;
        setScrollX(Math.min(progress * scrollWidth, scrollWidth));
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ height: '300vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        <div
          ref={scrollRef}
          className="flex gap-5 px-6"
          style={{ transform: `translateX(-${scrollX}px)`, willChange: 'transform' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
