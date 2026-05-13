'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * Public liste sayfaları için ince bir client wrapper.
 *
 * Sayfa server-component olarak kalır (ISR + SEO için kritik); kartlar
 * `data-searchable="lowercase metin"` attribute'ü taşır. Bu component
 * ref ile container'ı izler, query'ye göre eşleşmeyen kartların
 * style.display'ini 'none'a çeker — DOM'da kalır ama görünmez.
 *
 * Filtre client-side: yapılandırılan ISR kartlarının kendisine
 * dokunmuyor (revalidation rotasını bozmuyor), sadece DOM seviyesinde
 * gizle/göster yapıyor. Bu yüzden SSR ilk render'da TÜM kartlar
 * görünür → bot/anonim/JS-disabled için tam liste, JS yüklenince
 * input aktifleşir.
 *
 * children içinde 3-4 farklı section olsa bile (örn. /tr/artist'te
 * Solo / Grup / Besteci), her birinin altındaki tüm kartları aynı
 * input filtreliyor — kullanıcı "miles" yazdığında o ismi içeren
 * kart hangi section'da olursa olsun görünmeye devam eder.
 */
export default function PublicListSearch({
  placeholder,
  children,
  emptyText,
}: {
  /** Input placeholder, ör. "Sanatçı ara…" */
  placeholder: string;
  /** Filtrelenecek kartları içeren bölüm. Her kartın
   *  `data-searchable="..."` attribute'ü olmalı. */
  children: React.ReactNode;
  /** Eşleşme yokken gösterilecek metin. Boş bırakılırsa
   *  "Sonuç bulunamadı" gösterilir. */
  emptyText?: string;
}) {
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [hits, setHits] = useState<number | null>(null);
  const inputId = useId();

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const q = query.trim().toLowerCase();

    // Tüm searchable kartları gez. Tek elementin görünür/gizli
    // durumunu set ederken parent section'larını da kontrol et —
    // bir section'da hiç eşleşme yoksa header'ı (genre title vb.)
    // de gizleyelim ki "boş section başlığı" görünmesin.
    const items = root.querySelectorAll<HTMLElement>('[data-searchable]');
    let visible = 0;
    items.forEach((el) => {
      const text = (el.getAttribute('data-searchable') || '').toLowerCase();
      const match = !q || text.includes(q);
      el.style.display = match ? '' : 'none';
      if (match) visible++;
    });

    // Section visibility: bir [data-search-section] içinde 0 görünür
    // kart varsa section'ı gizle. Section yoksa atla.
    const sections = root.querySelectorAll<HTMLElement>('[data-search-section]');
    sections.forEach((sec) => {
      const visibleInSection = Array.from(
        sec.querySelectorAll<HTMLElement>('[data-searchable]'),
      ).some((el) => el.style.display !== 'none');
      sec.style.display = visibleInSection ? '' : 'none';
    });

    setHits(q ? visible : null);
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative w-full md:w-80">
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/10 rounded-full text-sm text-white placeholder:text-white/40 outline-none hover:border-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/10 transition-colors"
          />
          <svg
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        {hits !== null && (
          <p className="text-xs text-white/50">
            {hits === 0
              ? emptyText || 'Sonuç bulunamadı'
              : `${hits} sonuç`}
          </p>
        )}
      </div>

      <div ref={containerRef}>{children}</div>
    </div>
  );
}
