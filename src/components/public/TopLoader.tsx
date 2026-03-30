'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function TopLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setLoading(true);
    setProgress(30);

    const t1 = setTimeout(() => setProgress(60), 100);
    const t2 = setTimeout(() => setProgress(90), 200);
    const t3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => { setLoading(false); setProgress(0); }, 200);
    }, 400);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [pathname]);

  if (!loading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[2px]">
      <div
        className="h-full bg-white transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          boxShadow: '0 0 8px rgba(255,255,255,0.4)',
        }}
      />
    </div>
  );
}
