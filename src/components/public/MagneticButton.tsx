'use client';

import { useRef, useState } from 'react';

export default function MagneticButton({ children, className = '', href }: { children: React.ReactNode; className?: string; href?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function handleMouse(e: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.3;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.3;
    setPos({ x, y });
  }

  function handleLeave() { setPos({ x: 0, y: 0 }); }

  const style = { transform: `translate(${pos.x}px, ${pos.y}px)`, transition: pos.x === 0 ? 'transform 0.4s ease' : 'transform 0.15s ease' };

  const Tag = href ? 'a' : 'div';

  return (
    <Tag href={href} ref={ref as React.Ref<HTMLDivElement & HTMLAnchorElement>} onMouseMove={handleMouse} onMouseLeave={handleLeave} className={className} style={style}>
      {children}
    </Tag>
  );
}
