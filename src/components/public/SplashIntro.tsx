'use client';

import { useState, useEffect } from 'react';

interface SplashIntroProps {
  title?: string;
  tagline?: string;
}

export default function SplashIntro({
  title = 'BEYOND THE MUSIC',
  tagline = 'müziğin ötesinde',
}: SplashIntroProps) {
  const [scrollY, setScrollY] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [vh, setVh] = useState(800);

  useEffect(() => {
    // Defer initial state reads to next microtask so the effect body is a pure subscription
    const id = requestAnimationFrame(() => {
      if (sessionStorage.getItem('btm-intro')) {
        setHidden(true);
        return;
      }
      setVh(window.innerHeight);
    });

    function onScroll() {
      setScrollY(window.scrollY);
      if (window.scrollY > window.innerHeight * 0.85) {
        sessionStorage.setItem('btm-intro', '1');
        setHidden(true);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  if (hidden) return null;

  const progress = Math.min(1, scrollY / (vh * 0.75));
  const curtainX = progress * 110;
  const contentOpacity = Math.max(0, 1 - progress * 2.5);
  const contentScale = 1 + progress * 0.15;

  return (
    <>
      <div className="h-screen" />

      <div className="fixed inset-0 z-[200]" style={{ pointerEvents: progress > 0.9 ? 'none' : 'auto' }}>
        {/* Curtains */}
        <div className="absolute top-0 left-0 w-1/2 h-full bg-[#0a0a0b]" style={{ transform: `translateX(-${curtainX}%)` }} />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[#0a0a0b]" style={{ transform: `translateX(${curtainX}%)` }} />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ opacity: contentOpacity, transform: `scale(${contentScale})` }}>

          {/* Equalizer */}
          <div className="flex items-end gap-[3px] h-8 mb-8">
            {[0.6, 1, 0.4, 0.8, 0.5, 1, 0.7, 0.3, 0.9, 0.5].map((h, i) => (
              <div key={i} className="w-[3px] bg-white/60 rounded-full animate-breathe"
                style={{ height: `${h * 32}px`, animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>

          <h1 className="text-white font-black tracking-[-0.03em] font-editorial text-center leading-[0.95]" style={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)' }}>
            {title}
          </h1>
          <p className="text-zinc-500 text-[11px] md:text-xs tracking-[0.35em] uppercase mt-5 font-semibold">{tagline}</p>

          {/* Scroll indicator - animated arrow */}
          <div className="absolute bottom-12 flex flex-col items-center">
            <div className="flex flex-col items-center animate-bounce">
              <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              <svg className="w-5 h-5 text-white/20 -mt-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
