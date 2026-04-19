'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Admin liste sayfalarında:
 *   /  → arama kutusuna odaklan
 *   Esc → arama kutusundayken temizle ve blur
 *
 * Odak zaten bir input/textarea/contentEditable'da ise `/` yutulmaz.
 */
export function useSearchShortcut(
  ref: RefObject<HTMLInputElement | null>,
  opts: { onClear?: () => void } = {},
) {
  const { onClear } = opts;
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable;

      if (e.key === '/' && !isEditable && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
        return;
      }

      if (
        e.key === 'Escape' &&
        document.activeElement === ref.current &&
        ref.current
      ) {
        if (ref.current.value) {
          e.preventDefault();
          onClear?.();
          ref.current.blur();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ref, onClear]);
}
