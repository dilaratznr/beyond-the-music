'use client';

import { usePathname } from 'next/navigation';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      style={{
        animation: 'btm-page-in 0.35s ease-out both',
      }}
    >
      <style jsx>{`
        @keyframes btm-page-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
      {children}
    </div>
  );
}
