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

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&locale=${locale}`);
      const data = await res.json();
      setResults(data.results || []);
      setLoading(false);
    }, 250);
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
            <input
              id="site-search-input"
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-autocomplete="list"
              aria-controls="site-search-results"
              placeholder={locale === 'tr' ? 'Sanatçı, tür, makale ara...' : 'Search artists, genres, articles...'}
              className="w-52 md:w-72 pl-8 pr-3 py-1.5 bg-white/10 border border-white/10 rounded-lg text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-white/25 transition-colors"
            />
            {query && (
              <button
                type="button"
                aria-label={clearLabel}
                onClick={() => { setQuery(''); setResults([]); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
              >
                <span aria-hidden="true">✕</span>
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => { setOpen(false); setQuery(''); setResults([]); }}
            className="text-zinc-500 hover:text-white text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Results dropdown */}
      {open && query.length >= 2 && (
        <div
          id="site-search-results"
          role="listbox"
          aria-label={locale === 'tr' ? 'Arama sonuçları' : 'Search results'}
          className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50"
        >
          {loading ? (
            <div className="p-4 text-center text-zinc-500 text-xs" role="status" aria-live="polite">
              {locale === 'tr' ? 'Aranıyor...' : 'Searching...'}
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 text-xs" role="status">
              {locale === 'tr' ? `"${query}" için sonuç bulunamadı` : `No results for "${query}"`}
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              <p className="px-4 pt-3 pb-1 text-[9px] text-zinc-600 uppercase tracking-widest font-bold">
                {results.length} {locale === 'tr' ? 'sonuç' : 'results'}
              </p>
              {results.map((r, i) => (
                <Link
                  key={`${r.type}-${r.slug}-${i}`}
                  href={getHref(r)}
                  role="option"
                  aria-selected="false"
                  onClick={() => { setOpen(false); setQuery(''); setResults([]); }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
                >
                  {r.image ? (
                    <img src={r.image} alt="" aria-hidden="true" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-600 text-sm flex-shrink-0" aria-hidden="true">
                      {r.type === 'genre' ? '♫' : r.type === 'artist' ? '♪' : r.type === 'article' ? '✎' : '◉'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{r.title}</p>
                    <p className="text-[10px] text-zinc-500">{typeLabels[r.type] || r.type} · {r.sub}</p>
                  </div>
                </Link>
              ))}
              <Link
                href={`/${locale}/search?q=${encodeURIComponent(query)}`}
                onClick={() => { setOpen(false); }}
                className="block px-4 py-3 text-center text-xs font-medium text-zinc-400 hover:text-white border-t border-zinc-800 transition-colors"
              >
                {locale === 'tr' ? `"${query}" için tüm sonuçları gör →` : `See all results for "${query}" →`}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
