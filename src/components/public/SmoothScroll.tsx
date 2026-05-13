'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '@/lib/use-reduced-motion';

gsap.registerPlugin(ScrollTrigger);

/**
 * Light GSAP animations: one-shot fade/slide/stagger (no scrub).
 * Each element triggers once; CSS fallback for JS-disabled (graceful degrade).
 *
 * `prefers-reduced-motion: reduce` aktifse: useEffect erkenden return eder,
 * GSAP hiç register etmez. Animasyonlu class'lar (`.gsap-fade-up` vb.)
 * üstündeki içerik `opacity:1` initial state'iyle anında görünür kalır —
 * "starts hidden, fades in" tasarımı vestibüler rahatsızlık duyan
 * kullanıcı için anlık görünen statik içeriğe düşer.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      // Animasyon class'larını arayanlar olabilir — hızlıca opacity:1'e
      // çek (CSS'te .gsap-* class'ları varsayılan opacity:0 ile başlıyor
      // olabilir). Bu satır defensive: animasyon hiç kurulmuyor ama
      // initial state'in görünmez olma riskini de kapatıyoruz.
      const all = document.querySelectorAll<HTMLElement>(
        '.gsap-fade-up, .gsap-slide-left, .gsap-slide-right, .gsap-zoom-in, .gsap-rise, .gsap-stagger',
      );
      all.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    const ctx = gsap.context(() => {
      const oneShot = (selector: string, from: gsap.TweenVars, duration = 0.7) => {
        gsap.utils.toArray<HTMLElement>(selector).forEach((el) => {
          gsap.set(el, { opacity: 1 });
          gsap.fromTo(
            el,
            from,
            {
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
              duration,
              ease: 'power2.out',
              scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
            },
          );
        });
      };

      oneShot('.gsap-fade-up', { opacity: 0, y: 30 });
      oneShot('.gsap-slide-left', { opacity: 0, x: -40 }, 0.8);
      oneShot('.gsap-slide-right', { opacity: 0, x: 40 }, 0.8);
      oneShot('.gsap-zoom-in', { opacity: 0, scale: 0.94 }, 0.7);
      oneShot('.gsap-rise', { opacity: 0, y: 10 }, 0.5);

      // Stagger: child'ları sırayla aç
      gsap.utils.toArray<HTMLElement>('.gsap-stagger').forEach((container) => {
        const kids = Array.from(container.children) as HTMLElement[];
        gsap.set(kids, { opacity: 1 });
        gsap.fromTo(
          kids,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.06,
            ease: 'power2.out',
            scrollTrigger: { trigger: container, start: 'top 88%', toggleActions: 'play none none none' },
          },
        );
      });
    });

    return () => ctx.revert();
  }, [reduced]);

  return <>{children}</>;
}
