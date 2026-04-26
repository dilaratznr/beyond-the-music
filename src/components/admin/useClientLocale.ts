'use client';

import { useSyncExternalStore } from 'react';

/**
 * Admin locale for preview links. Priority: NEXT_LOCALE cookie >
 * navigator.language > tr default. useSyncExternalStore avoids hydration mismatch.
 */
function subscribe(): () => void {
  // Cookie/Navigator changes not subscribed; single read.
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
