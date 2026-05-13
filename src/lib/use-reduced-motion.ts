'use client';

import { useEffect, useState } from 'react';

/**
 * `prefers-reduced-motion: reduce` MediaQuery'sini reaktif olarak okur.
 *
 * Sistem ayarı runtime'da değişebilir (macOS Settings'ten açıp kapatma),
 * o yüzden basit `window.matchMedia(...).matches` snapshot yetmiyor —
 * MediaQueryList'in `change` event'ini dinleyip state'i güncelliyoruz.
 *
 * SSR: ilk render'da `false` döner (sunucu kullanıcı tercihini bilmez).
 * Hydration sonrası gerçek değer state'e geçer; animasyonu başlatan
 * useEffect bu state'i okuduğu için bir frame içinde durdurulabilir.
 *
 * Kullanım:
 *   const reduced = useReducedMotion();
 *   useEffect(() => {
 *     if (reduced) return;     // animasyonu hiç kurma
 *     // gsap.from(...) vb.
 *   }, [reduced]);
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    // Safari < 14 addListener yerine eski API; addEventListener
    // her modern tarayıcıda var, fallback gerekmiyor (Next 16 hedefli).
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
