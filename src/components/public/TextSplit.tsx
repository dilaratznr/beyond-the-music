'use client';

import { useEffect, useRef, useState } from 'react';

export default function TextSplit({ text, className = '', tag = 'h1' }: { text: string; className?: string; tag?: 'h1' | 'h2' | 'h3' | 'p' }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const Tag = tag;

  return (
    <div ref={ref} className="overflow-hidden">
      <Tag className={className} style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {text}
      </Tag>
    </div>
  );
}
