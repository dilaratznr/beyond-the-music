'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Start animations ASAP after DOM is ready. Previously waited 300ms
    // which made pages feel sluggish on production (fast network = visible lag).
    const timeout = setTimeout(() => {
      // ── SCENE ZOOM: scroll ettikce section zoom ile acilir ──
      gsap.utils.toArray<HTMLElement>('.scene').forEach((el) => {
        const inner = el.querySelector('.scene-inner') as HTMLElement;
        if (!inner) return;
        gsap.fromTo(inner,
          { scale: 0.88, opacity: 0 },
          { scale: 1, opacity: 1, ease: 'none',
            scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 30%', scrub: true } }
        );
      });

      // ── IMAGE REVEAL: clip ile acilir ──
      gsap.utils.toArray<HTMLElement>('.img-reveal').forEach((el) => {
        gsap.fromTo(el,
          { clipPath: 'inset(15% 15% 15% 15%)', scale: 1.15 },
          { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.2, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 80%', toggleActions: 'play none none none' } }
        );
      });

      // ── TEXT CLIP REVEAL ──
      gsap.utils.toArray<HTMLElement>('.text-clip-reveal').forEach((el) => {
        gsap.fromTo(el,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 80%', toggleActions: 'play none none none' } }
        );
      });

      // ── PARALLAX ──
      gsap.utils.toArray<HTMLElement>('.depth-slow').forEach((el) => {
        gsap.to(el, { y: -60, ease: 'none', scrollTrigger: { trigger: el.closest('section') || el.parentElement!, start: 'top bottom', end: 'bottom top', scrub: true } });
      });

      // ── HORIZONTAL SCROLL ──
      const hScroll = document.querySelector('.gsap-horizontal-scroll');
      if (hScroll) {
        const inner = hScroll.querySelector('.gsap-horizontal-inner') as HTMLElement;
        if (inner) {
          gsap.to(inner, {
            x: () => -(inner.scrollWidth - window.innerWidth + 40),
            ease: 'none',
            scrollTrigger: { trigger: hScroll, start: 'top top', end: () => `+=${inner.scrollWidth}`, scrub: 1, pin: true, anticipatePin: 1 },
          });
        }
      }

      // ── STAGGER ──
      gsap.utils.toArray<HTMLElement>('.gsap-stagger').forEach((container) => {
        gsap.fromTo(container.children,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out',
            scrollTrigger: { trigger: container, start: 'top 80%', toggleActions: 'play none none none' } }
        );
      });

      // ── FADE UP ──
      gsap.utils.toArray<HTMLElement>('.gsap-fade-up').forEach((el) => {
        gsap.fromTo(el, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' } });
      });

      // ── SLIDES ──
      gsap.utils.toArray<HTMLElement>('.gsap-slide-left').forEach((el) => {
        gsap.fromTo(el, { opacity: 0, x: -80 }, { opacity: 1, x: 0, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' } });
      });

      // ── LINE GROW ──
      gsap.utils.toArray<HTMLElement>('.gsap-line').forEach((el) => {
        gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'power3.out', transformOrigin: 'left',
          scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' } });
      });

      ScrollTrigger.refresh();
    }, 50);

    return () => { clearTimeout(timeout); ScrollTrigger.getAll().forEach((t) => t.kill()); };
  }, []);

  return <>{children}</>;
}
