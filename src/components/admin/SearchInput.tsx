'use client';

import { type RefObject } from 'react';

/**
 * Standart admin liste arama kutusu. `/admin/genres` ve `/admin/topics`
 * sayfalarında tekrar tekrar yazılan input + kbd hint paterni — şimdi
 * tek componentten geliyor. `/` kısayolu için `useSearchShortcut` ayrı
 * hook, çağıran sayfa kullanmalı.
 *
 * Server-side search'lü sayfalar SWR key'ine `q` parametresini ekleyerek
 * URL'i otomatik refetch ettirebilir (örn. albums/songs/articles).
 * Client-side filter yapan sayfalar (genres/topics) `value` + `onChange`
 * üstünden state'i yönetir.
 */
export default function SearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  inputRef,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  ariaLabel?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="pl-3 pr-10 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-xs text-zinc-100 placeholder:text-zinc-500 outline-none hover:border-zinc-600 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 w-56 transition-colors"
      />
      <kbd
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 leading-none pointer-events-none hidden sm:inline"
        aria-hidden="true"
      >
        /
      </kbd>
    </div>
  );
}
