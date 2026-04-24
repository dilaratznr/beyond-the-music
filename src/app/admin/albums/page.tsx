'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Pagination from '@/components/admin/Pagination';
import DeleteButton from '@/components/admin/DeleteButton';
import BulkActionBar, { BulkCheckbox } from '@/components/admin/BulkActionBar';
import { useBulkSelection } from '@/lib/bulk-selection';
import StatusPill from '@/components/admin/StatusPill';

interface Album { id: string; title: string; slug: string; coverImage: string | null; artist: { name: string }; _count: { songs: number }; releaseDate: string | null; status: string; }
const PER_PAGE = 15;

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/albums?page=${page}&limit=${PER_PAGE}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setAlbums(d.items || []);
        setTotal(d.total || 0);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, reloadToken]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadToken((t) => t + 1);
  }, []);

  const goToPage = useCallback((p: number) => {
    setLoading(true);
    setPage(p);
  }, []);

  const pageIds = useMemo(() => albums.map((a) => a.id), [albums]);
  const sel = useBulkSelection(pageIds);

  const onBulkCleared = useCallback(() => {
    sel.clear();
    reload();
  }, [sel, reload]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Albümler</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">{total} albüm</p>
        </div>
        <div className="flex items-center gap-2">
          {pageIds.length > 0 && (
            // The outer <button> handles the click — the visual checkbox is a
            // decorative <span> so we don't nest <button> inside <button>
            // (HTML invalidates that and React throws a hydration error).
            <button
              type="button"
              onClick={() => sel.toggleAllOnPage(pageIds)}
              aria-pressed={sel.allSelected}
              aria-label="Sayfadaki tüm albümleri seç"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            >
              <span
                aria-hidden="true"
                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  sel.allSelected || sel.someSelected
                    ? 'bg-white border-white text-zinc-950'
                    : 'bg-zinc-900 border-zinc-600'
                }`}
              >
                {sel.someSelected ? (
                  <span className="block w-2 h-[2px] bg-zinc-950" />
                ) : sel.allSelected ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : null}
              </span>
              {sel.allSelected ? 'Seçimi Temizle' : 'Sayfadakileri Seç'}
            </button>
          )}
          {/* Plain <a>: API route returning a CSV, not a Next page. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/admin/export/albums"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            title="Tüm albümleri (şarkılarıyla birlikte) CSV olarak indir"
          >
            CSV indir
          </a>
          <Link
            href="/admin/import"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            CSV içe aktar
          </Link>
          <Link
            href="/admin/albums/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-zinc-950 rounded-md text-xs font-semibold hover:bg-zinc-200 transition-colors"
          >
            + Yeni Albüm
          </Link>
        </div>
      </div>

      <BulkActionBar
        count={sel.count}
        itemLabel="albüm"
        endpoint="/api/albums/bulk-delete"
        ids={sel.ids}
        onCleared={onBulkCleared}
      />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: PER_PAGE }).map((_, i) => (
            <div
              key={i}
              className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden"
            >
              <div className="aspect-square bg-zinc-800/60 animate-pulse" />
              <div className="p-3 space-y-1.5">
                <div className="h-3 bg-zinc-800/60 rounded animate-pulse w-4/5" />
                <div className="h-2.5 bg-zinc-800/60 rounded animate-pulse w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {albums.map((a) => {
              const isChecked = sel.isSelected(a.id);
              return (
                <div
                  key={a.id}
                  className={`group relative bg-zinc-900/40 rounded-lg border overflow-hidden transition-all ${
                    isChecked
                      ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/30'
                      : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70'
                  }`}
                >
                  {/* Selection checkbox — always visible when selected,
                      otherwise fades in on hover so the grid stays uncluttered. */}
                  <div
                    className={`absolute top-2 left-2 z-10 transition-opacity ${
                      isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                    }`}
                  >
                    <BulkCheckbox
                      checked={isChecked}
                      onChange={() => sel.toggle(a.id)}
                      ariaLabel={`${a.title} seç`}
                    />
                  </div>
                  <Link
                    href={`/admin/albums/${a.id}`}
                    className="block aspect-square bg-zinc-900 relative overflow-hidden"
                    aria-label={`${a.title} düzenle`}
                  >
                    {a.coverImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={a.coverImage}
                        alt={a.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700">
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="9" />
                          <circle cx="12" cy="12" r="2" />
                        </svg>
                      </div>
                    )}
                    {/* overlay bottom gradient */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                    {/* song count pill */}
                    {a._count.songs > 0 && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-zinc-200 text-[10px] font-medium rounded ring-1 ring-white/10">
                        {a._count.songs} şarkı
                      </span>
                    )}
                  </Link>
                  <div className="p-3">
                    <Link href={`/admin/albums/${a.id}`} className="block min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[13px] font-semibold text-zinc-100 tracking-tight truncate group-hover:text-white transition-colors">
                          {a.title}
                        </h3>
                        {a.status && a.status !== 'PUBLISHED' && (
                          <StatusPill status={a.status} compact />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{a.artist.name}</p>
                      <p className="text-[10px] text-zinc-600 mt-1.5">
                        {a.releaseDate ? new Date(a.releaseDate).getFullYear() : 'Tarih yok'}
                      </p>
                    </Link>
                    <div className="mt-2.5 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between gap-1">
                      <Link
                        href={`/admin/albums/${a.id}`}
                        className="text-[11px] text-zinc-300 hover:text-white transition-colors font-medium"
                      >
                        Düzenle
                      </Link>
                      <DeleteButton
                        endpoint={`/api/albums/${a.id}`}
                        confirmMessage={`"${a.title}" albümünü silmek istediğinizden emin misiniz?`}
                        entityName={a.title}
                        entityKind="Albüm"
                        onDeleted={reload}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            page={page}
            totalPages={Math.ceil(total / PER_PAGE)}
            onPageChange={goToPage}
            total={total}
            perPage={PER_PAGE}
          />
        </>
      )}
    </div>
  );
}
