'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * GSAP scroll animasyonlarını bağlar. Production'da görülen iki sorun
 * çözüldü:
 *
 * 1) Horizontal scroll sadece 3-4 kart gösteriyordu: Unsplash resimleri
 *    ilk DOM ölçümü sırasında henüz yüklenmediği için `scrollWidth`
 *    yanlış hesaplanıyor → GSAP x-translate mesafesi kısa kalıyor →
 *    kullanıcı aşağı scroll edince "bitmiş" gibi görünüyor. Çözüm:
 *    ScrollTrigger'ı resim yükleme / font hazırlığı / resize
 *    olaylarında yeniden refresh etmek.
 *
 * 2) `.gsap-fade-up` ve benzeri elementler `opacity: 0` ile başlıyor —
 *    ScrollTrigger herhangi bir sebeple tetiklenmezse (viewport
 *    hesaplama hatası, pin conflict, vs.) element hep görünmez kalıyor.
 *    Çözüm: setup aşamasında elementi direkt visible yap, sadece
 *    enter/exit için animate et. Böylece GSAP yok / başarısız olsa bile
 *    içerik gösterilir (graceful degradation).
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
          { scale: 0.92, opacity: 0.35 },
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
        // Başta görünür ama hafif kırpılmış olarak bırak; GSAP tetiklenirse
        // açılır, tetiklenmezse yine de içerik görünür.
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
      const hScroll = document.querySelector<HTMLElement>('.gsap-horizontal-scroll');
      if (hScroll) {
        const inner = hScroll.querySelector<HTMLElement>('.gsap-horizontal-inner');
        if (inner) {
          gsap.to(inner, {
            x: () => -(inner.scrollWidth - window.innerWidth + 40),
            ease: 'none',
            scrollTrigger: {
              trigger: hScroll,
              start: 'top top',
              end: () => `+=${inner.scrollWidth}`,
              scrub: 1,
              pin: true,
              anticipatePin: 1,
              // Her yenilemede mesafeyi yeniden hesapla — resim yükleme
              // sonrası scrollWidth değişince doğru scroll uzunluğu alınır.
              invalidateOnRefresh: true,
            },
          });
        }
      }

      // ── STAGGER — content görünür başlıyor, GSAP varsa animate olur ──
      gsap.utils.toArray<HTMLElement>('.gsap-stagger').forEach((container) => {
        const kids = Array.from(container.children) as HTMLElement[];
        // İlk anda görünür yap; aşağıdaki fromTo GSAP hazırsa opaklığı 0'a
        // çekip sonra yükseltecek, hazır değilse zaten visible kalır.
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

      ScrollTrigger.refresh();
    };

    // İlk kurulumu bir frame sonrasına erteliyoruz — React DOM'u yazsın.
    const rafId = requestAnimationFrame(setup);

    // Resim / font yüklendikçe ScrollTrigger'ı yenile ki scrollWidth'lar doğru hesaplansın.
    const refresh = () => {
      if (!cancelled) ScrollTrigger.refresh();
    };

    // Font ready
    if ('fonts' in document) {
      (document as Document & { fonts: FontFaceSet }).fonts.ready.then(refresh);
    }

    // Tüm kaynaklar (resimler dahil) yüklendiğinde
    if (document.readyState === 'complete') {
      // Zaten yüklü — bir sonraki frame'de refresh
      requestAnimationFrame(refresh);
    } else {
      window.addEventListener('load', refresh, { once: true });
    }

    // Horizontal container'ın boyutu değişirse yenile (resim geldikçe scrollWidth büyüyor).
    let resizeObserver: ResizeObserver | null = null;
    const hScroll = document.querySelector<HTMLElement>('.gsap-horizontal-scroll .gsap-horizontal-inner');
    if (hScroll && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => refresh());
      resizeObserver.observe(hScroll);
    }

    // Resim her yüklendiğinde de yenile — observer yakalamadıysa garanti olsun.
    const imgs = Array.from(document.querySelectorAll('img'));
    const imgHandler = () => refresh();
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener('load', imgHandler, { once: true });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('load', refresh);
      resizeObserver?.disconnect();
      imgs.forEach((img) => img.removeEventListener('load', imgHandler));
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return <>{children}</>;
}
