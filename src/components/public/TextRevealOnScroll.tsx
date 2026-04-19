'use client';

import { useRef, useEffect, useState } from 'react';

export default function TextRevealOnScroll({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const start = window.innerHeight * 0.85;
      const end = window.innerHeight * 0.2;
      setProgress(Math.max(0, Math.min(1, (start - rect.top) / (start - end))));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const words = text.split(' ');

  return (
    <div ref={ref} className={className}>
      <p className="leading-[1.3]">
        {words.map((word, i) => {
          const wp = Math.max(0, Math.min(1, (progress * words.length - i)));
          return (
            <span key={i} className="inline-block mr-[0.25em]"
              style={{
                color: `rgba(255,255,255,${0.08 + wp * 0.92})`,
                transform: `translateY(${(1 - wp) * 4}px)`,
                transition: 'color 0.15s ease, transform 0.15s ease',
              }}>
              {word}
            </span>
          );
        })}
      </p>
    </div>
  );
}
