'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * GSAP scroll animasyonları.
 *
 * Production'da iki sorun vardı:
 *
 * 1) Horizontal "türler" bölümü yalnızca 3-4 kart gösteriyordu. Sebep:
 *    Unsplash resimleri yüklenmeden önce GSAP scrollWidth'i okuyor,
 *    pin mesafesi olması gerekenden kısa çıkıyor, bölüm erken bitiyor.
 *    Çözüm: pin mesafesi ve x-translate'i *aynı* distance fonksiyonundan
 *    türetmek + fonts.ready / window.load / ResizeObserver / her img load
 *    olayında ScrollTrigger.refresh() çağırmak. invalidateOnRefresh
 *    sayesinde her refresh'te distance yeniden hesaplanıyor.
 *
 * 2) .gsap-fade-up / .gsap-stagger elementleri opacity:0 ile başlıyor;
 *    ScrollTrigger tetiklenmezse içerik hep gizli kalıyor. Çözüm:
 *    setup sırasında görünür yapıp fromTo ile animate etmek. GSAP
 *    başarısız olsa bile içerik görünür kalır (graceful degradation).
 *
 * Mobilde: horizontal-viewport'a `overflow-x-auto` verildi. Pin
 * tetiklenmese bile parmakla yatay kaydırılabilir.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    const setup = () => {
      if (cancelled) return;

      // ── SCENE ZOOM ──
      gsap.utils.toArray<HTMLElement>('.scene').forEach((el) => {
        const inner = el.querySelector('.scene-inner') as HTMLElement | null;
        if (!inner) return;
        gsap.set(inner, { transformOrigin: 'center center' });
        gsap.fromTo(
          inner,
          { scale: 0.94, opacity: 0.5 },
          {
            scale: 1,
            opacity: 1,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 30%', scrub: true },
          },
        );
      });

      // ── IMAGE REVEAL ──
      gsap.utils.toArray<HTMLElement>('.img-reveal').forEach((el) => {
        gsap.fromTo(
          el,
          { clipPath: 'inset(8% 8% 8% 8%)', scale: 1.08 },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            scale: 1,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
          },
        );
      });

      // ── HORIZONTAL SCROLL ──
      // Tüm ekran boylarında pin + scrub çalıştırıyoruz (kullanıcı "mobilde de
      // kayıyordu" dedi). x-translate ve pin mesafesi AYNI `distance()`ten
      // türer — böylece son karta gelindiğinde pin de biter, biri bitip
      // diğeri devam etmez.
      const hScroll = document.querySelector<HTMLElement>('.gsap-horizontal-scroll');
      const hInner = hScroll?.querySelector<HTMLElement>('.gsap-horizontal-inner') ?? null;

      if (hScroll && hInner) {
        const distance = () => Math.max(0, hInner.scrollWidth - window.innerWidth);
        gsap.to(hInner, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: hScroll,
            start: 'top top',
            end: () => `+=${distance()}`,
            scrub: 0.6,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
      }

      // ── STAGGER — içerik görünür başlıyor, GSAP varsa animate eder ──
      gsap.utils.toArray<HTMLElement>('.gsap-stagger').forEach((container) => {
        const kids = Array.from(container.children) as HTMLElement[];
        gsap.set(kids, { opacity: 1 });
        gsap.fromTo(
          kids,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: { trigger: container, start: 'top 85%', toggleActions: 'play none none none' },
          },
        );
      });

      // ── FADE UP ──
      gsap.utils.toArray<HTMLElement>('.gsap-fade-up').forEach((el) => {
        gsap.set(el, { opacity: 1 });
        gsap.fromTo(
          el,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
          },
        );
      });

      // ── SLIDE LEFT ──
      gsap.utils.toArray<HTMLElement>('.gsap-slide-left').forEach((el) => {
        gsap.set(el, { opacity: 1 });
        gsap.fromTo(
          el,
          { opacity: 0, x: -60 },
          {
            opacity: 1,
            x: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
          },
        );
      });

      // ── LINE GROW ──
      gsap.utils.toArray<HTMLElement>('.gsap-line').forEach((el) => {
        gsap.fromTo(
          el,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.2,
            ease: 'power3.out',
            transformOrigin: 'left',
            scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
          },
        );
      });

      // ── SLIDE RIGHT ──
      gsap.utils.toArray<HTMLElement>('.gsap-slide-right').forEach((el) => {
        gsap.set(el, { opacity: 1 });
        gsap.fromTo(
          el,
          { opacity: 0, x: 60 },
          {
            opacity: 1,
            x: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
          },
        );
      });

      // ── ZOOM IN (hero'dan sonra gelen bölümlerde) ──
      gsap.utils.toArray<HTMLElement>('.gsap-zoom-in').forEach((el) => {
        gsap.set(el, { opacity: 1 });
        gsap.fromTo(
          el,
          { opacity: 0, scale: 0.9 },
          {
            opacity: 1,
            scale: 1,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
          },
        );
      });

      // ── PARALLAX (bg görseller için, scrub'lı) ──
      // depth-slow: yavaş kayar, arka plana hissi verir
      gsap.utils.toArray<HTMLElement>('.depth-slow').forEach((el) => {
        gsap.to(el, {
          yPercent: -12,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1 },
        });
      });
      // depth-medium: orta hızda parallax
      gsap.utils.toArray<HTMLElement>('.depth-medium').forEach((el) => {
        gsap.to(el, {
          yPercent: -20,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1 },
        });
      });
      // depth-fast: hızla kayar, ön plan
      gsap.utils.toArray<HTMLElement>('.depth-fast').forEach((el) => {
        gsap.to(el, {
          yPercent: -30,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1 },
        });
      });

      // ── TITLE WORDS REVEAL (büyük başlıkları kelime-kelime yumuşakça aç) ──
      gsap.utils.toArray<HTMLElement>('.gsap-title-reveal').forEach((el) => {
        const original = el.getAttribute('data-original') ?? el.textContent ?? '';
        // Idempotent: bir kere bölersek tekrar bölme (re-render'a dayanıklı)
        if (!el.querySelector('.word')) {
          el.setAttribute('data-original', original);
          el.innerHTML = original
            .split(/(\s+)/)
            .map((w) =>
              /\s+/.test(w)
                ? w
                : `<span class="word inline-block overflow-hidden align-bottom"><span class="inline-block will-change-transform">${w}</span></span>`,
            )
            .join('');
        }
        const inners = el.querySelectorAll<HTMLElement>('.word > span');
        gsap.set(inners, { yPercent: 0, opacity: 1 });
        gsap.fromTo(
          inners,
          { yPercent: 110, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.9,
            stagger: 0.06,
            ease: 'power4.out',
            scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
          },
        );
      });

      // ── FLOATING COUNTER / ACCENT (mikro hover ipucu) ──
      gsap.utils.toArray<HTMLElement>('.gsap-rise').forEach((el) => {
        gsap.set(el, { opacity: 1 });
        gsap.fromTo(
          el,
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
          },
        );
      });

      ScrollTrigger.refresh();
    };

    const rafId = requestAnimationFrame(setup);

    const refresh = () => {
      if (!cancelled) ScrollTrigger.refresh();
    };

    if (typeof document !== 'undefined' && 'fonts' in document) {
      (document as Document & { fonts: FontFaceSet }).fonts.ready.then(refresh);
    }

    if (typeof document !== 'undefined') {
      if (document.readyState === 'complete') {
        requestAnimationFrame(refresh);
      } else {
        window.addEventListener('load', refresh, { once: true });
      }
    }

    // Emniyet refresh'leri — ilk render'daki yarış koşullarına karşı (resim
    // cache hit/miss, font swap, hydration gecikmesi). Toplam maliyet: 4 çağrı.
    const safetyRefreshes = [400, 900, 1800, 3000].map((ms) =>
      window.setTimeout(refresh, ms),
    );

    const onResize = () => refresh();
    window.addEventListener('resize', onResize);

    let resizeObserver: ResizeObserver | null = null;
    const hInner = document.querySelector<HTMLElement>(
      '.gsap-horizontal-scroll .gsap-horizontal-inner',
    );
    if (hInner && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(refresh);
      resizeObserver.observe(hInner);
    }

    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'));
    const imgHandler = () => refresh();
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener('load', imgHandler, { once: true });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      safetyRefreshes.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('load', refresh);
      window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
      imgs.forEach((img) => img.removeEventListener('load', imgHandler));
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return <>{children}</>;
}
