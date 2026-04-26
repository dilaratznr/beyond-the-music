'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface Result {
  type: 'genre' | 'artist' | 'album' | 'architect' | 'article' | 'listening-path';
  slug: string;
  title: string;
  image: string | null;
  sub: string;
}

const TYPE_LINKS: Record<string, string> = {
  genre: 'genre', artist: 'artist', album: 'artist',
  architect: 'architects', article: 'article', 'listening-path': 'listening-paths',
};

const TYPE_LABELS_TR: Record<string, string> = {
  genre: 'Tür', artist: 'Sanatçı', album: 'Albüm',
  architect: 'Mimar', article: 'Makale', 'listening-path': 'Rota',
};

const TYPE_LABELS_EN: Record<string, string> = {
  genre: 'Genre', artist: 'Artist', album: 'Album',
  architect: 'Architect', article: 'Article', 'listening-path': 'Path',
};

export default function SearchBar({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  const typeLabels = locale === 'tr' ? TYPE_LABELS_TR : TYPE_LABELS_EN;
  const openLabel = locale === 'tr' ? 'Aramayı aç' : 'Open search';
  const closeLabel = locale === 'tr' ? 'Aramayı kapat' : 'Close search';
  const clearLabel = locale === 'tr' ? 'Aramayı temizle' : 'Clear search';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      // Nothing to fetch. Clear any stale results on the next tick so we don't
      // trigger a cascading render inside this effect.
      clearTimeout(debounceRef.current);
      const t = setTimeout(() => setResults((prev) => (prev.length ? [] : prev)), 0);
      return () => clearTimeout(t);
    }

    // Hızlı yazarken yarışan fetch'leri iptal ediyoruz — önceki istek hala
    // uçuşurken yenisi gelirse, eskisini AbortController ile öldürüyoruz.
    // Debounce 400ms: kullanıcı yazarken her harfte ağ isteği oluşmuyor,
    // yazma bittikten sonra bir istek atılıyor.
    clearTimeout(debounceRef.current);
    const controller = new AbortController();

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&locale=${locale}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        // AbortError — yeni bir fetch başladı, sonucu düşebiliriz
        if ((err as Error).name !== 'AbortError') {
          console.error('[search] fetch error:', err);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [query, locale]);

  function getHref(r: Result) {
    if (r.type === 'album') return `/${locale}/artist/${r.slug}`;
    return `/${locale}/${TYPE_LINKS[r.type]}/${r.slug}`;
  }

  return (
    <div ref={ref} className="relative">
      {/* Search toggle button */}
      {!open && (
        <button
          type="button"
          aria-label={openLabel}
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
          className="text-zinc-400 hover:text-white transition-colors p-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </button>
      )}

      {/* Search input */}
      {open && (
        <div role="search" className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <label htmlFor="site-search-input" className="sr-only">
              {locale === 'tr' ? 'Site içi arama' : 'Site search'}
            </label>
            {/* type="text" — type="search" olsa tarayıcı kendi `×`'ini
                basıyor, custom clear ile yan yana 2 çarpı görünüyordu.
                Clear butonunu biz kontrol ediyoruz, native'e gerek yok. */}
            <input
              id="site-search-input"
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-autocomplete="list"
              aria-controls="site-search-results"
              autoComplete="off"
              spellCheck={false}
              placeholder={locale === 'tr' ? 'Sanatçı, tür, makale…' : 'Search the archive…'}
              className="w-52 md:w-80 pl-8 pr-8 py-2 bg-white/[0.04] border border-white/10 rounded-full text-white text-[13px] placeholder-zinc-500 placeholder:italic focus:outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all"
            />
            {/* Akıllı tek X: query varsa yazıyı temizler, boşken paneli
                kapatır. Önceden input içinde + dışında iki ayrı X vardı,
                kullanıcıya kafa karıştırıcı geliyordu. */}
            <button
              type="button"
              aria-label={query ? clearLabel : closeLabel}
              onClick={() => {
                if (query) {
                  setQuery('');
                  setResults([]);
                  inputRef.current?.focus();
                } else {
                  setOpen(false);
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs p-0.5"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>
      )}

      {/* Results dropdown */}
      {open && query.length >= 2 && (
        <div
          id="site-search-results"
          role="listbox"
          aria-label={locale === 'tr' ? 'Arama sonuçları' : 'Search results'}
          className="absolute top-full right-0 mt-3 w-80 md:w-96 bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
        >
          {loading ? (
            <div className="p-6 text-center text-zinc-500 text-xs italic" role="status" aria-live="polite">
              {locale === 'tr' ? 'Aranıyor…' : 'Searching…'}
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 text-xs italic" role="status">
              {locale === 'tr' ? (<>Arşivde <span className="text-zinc-300 not-italic">&ldquo;{query}&rdquo;</span> için kayıt yok.</>) : (<>No entry in the archive for <span className="text-zinc-300 not-italic">&ldquo;{query}&rdquo;</span>.</>)}
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              <p className="px-4 pt-4 pb-2 text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold border-b border-white/5">
                {results.length} {locale === 'tr' ? 'sonuç' : 'results'}
              </p>
              {results.map((r, i) => (
                <Link
                  key={`${r.type}-${r.slug}-${i}`}
                  href={getHref(r)}
                  role="option"
                  aria-selected="false"
                  onClick={() => { setOpen(false); setQuery(''); setResults([]); }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.04] transition-colors"
                >
                  {r.image ? (
                    <img src={r.image} alt="" aria-hidden="true" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    // Harf fallback'i yok — sadece gradient kutu (editoryal ton)
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-950 flex-shrink-0" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-white truncate">{r.title}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5 font-semibold">
                      {typeLabels[r.type] || r.type} · <span className="normal-case tracking-normal font-normal">{r.sub}</span>
                    </p>
                  </div>
                </Link>
              ))}
              <Link
                href={`/${locale}/search?q=${encodeURIComponent(query)}`}
                onClick={() => { setOpen(false); }}
                className="block px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/[0.04] border-t border-white/10 transition-colors"
              >
                {locale === 'tr' ? `Tüm sonuçlar →` : `All results →`}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
