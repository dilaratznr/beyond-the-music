'use client';

import { useSyncExternalStore } from 'react';

/**
 * Admin paneli tek dillidir ama "Sitede aç" gibi önizleme linklerinin
 * hangi dile gitmesi gerektiğini burada belirliyoruz.
 *
 * Öncelik sırası:
 * 1. NEXT_LOCALE cookie'si (next-intl ve çoğu i18n aracının kullandığı isim)
 * 2. Tarayıcı `navigator.language` öneki
 * 3. `tr` default
 *
 * `useSyncExternalStore` kullanıyoruz: sunucuda 'tr' döner, istemcide hydrate
 * sonrası gerçek değere geçer. Cascading render yok.
 */
function subscribe(): () => void {
  // Cookie/Navigator dilinde değişiklik için subscribe yok; tek atış okuma.
  return () => {};
}

function readSnapshot(): 'tr' | 'en' {
  if (typeof document !== 'undefined') {
    const row = document.cookie
      .split('; ')
      .find((r) => r.startsWith('NEXT_LOCALE='));
    if (row) {
      const v = decodeURIComponent(row.split('=')[1] ?? '');
      if (v === 'en' || v === 'tr') return v;
    }
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en')) {
    return 'en';
  }
  return 'tr';
}

function getServerSnapshot(): 'tr' | 'en' {
  return 'tr';
}

export function useClientLocale(): 'tr' | 'en' {
  return useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);
}
