'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Pagination from '@/components/admin/Pagination';
import DeleteButton from '@/components/admin/DeleteButton';
import { IconExternal } from '@/components/admin/Icons';
import BulkActionBar, { BulkCheckbox } from '@/components/admin/BulkActionBar';
import { useBulkSelection } from '@/lib/bulk-selection';

interface Song {
  id: string;
  title: string;
  trackNumber: number | null;
  duration: string | null;
  isDeepCut: boolean;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  album: {
    id: string;
    title: string;
    slug: string;
    coverImage: string | null;
    artist: { name: string };
  } | null;
}

interface AlbumOption {
  id: string;
  title: string;
  artist: { name: string };
}

const PER_PAGE = 20;

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [albumId, setAlbumId] = useState('');
  const [deepCutOnly, setDeepCutOnly] = useState(false);
  const [albums, setAlbums] = useState<AlbumOption[]>([]);

  useEffect(() => {
    fetch('/api/albums?page=1&limit=500')
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : d.items || [];
        setAlbums(list);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
    if (albumId) params.set('albumId', albumId);
    if (deepCutOnly) params.set('isDeepCut', 'true');
    fetch(`/api/songs?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setSongs(d.items || []);
        setTotal(d.total || 0);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, albumId, deepCutOnly, reloadToken]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadToken((t) => t + 1);
  }, []);

  const goToPage = useCallback((p: number) => {
    setLoading(true);
    setPage(p);
  }, []);

  const applyAlbum = useCallback((v: string) => {
    setLoading(true);
    setAlbumId(v);
    setPage(1);
  }, []);

  const toggleDeepCut = useCallback(() => {
    setLoading(true);
    setDeepCutOnly((v) => !v);
    setPage(1);
  }, []);

  const albumOptions = useMemo(
    () =>
      albums.map((a) => ({
        id: a.id,
        label: `${a.title}${a.artist?.name ? ' · ' + a.artist.name : ''}`,
      })),
    [albums],
  );

  const activeAlbumLabel = useMemo(
    () => albumOptions.find((a) => a.id === albumId)?.label,
    [albumOptions, albumId],
  );

  const pageIds = useMemo(() => songs.map((s) => s.id), [songs]);
  const sel = useBulkSelection(pageIds);

  const onBulkCleared = useCallback(() => {
    sel.clear();
    reload();
  }, [sel, reload]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Şarkılar</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            {total} şarkı{deepCutOnly ? ' · Deep Cut' : ''}
            {activeAlbumLabel ? ` · ${activeAlbumLabel}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Plain <a>: API route returning a CSV, not a Next page. */}
          <a
            href={`/api/admin/export/songs${albumId ? `?albumId=${albumId}` : ''}${
              deepCutOnly ? `${albumId ? '&' : '?'}isDeepCut=true` : ''
            }`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            title="Geçerli filtrelere göre CSV olarak indir"
          >
            CSV indir
          </a>
          <Link
            href="/admin/songs/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-zinc-950 rounded-md text-xs font-semibold hover:bg-zinc-200 transition-colors"
          >
            + Yeni Şarkı
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <select
            value={albumId}
            onChange={(e) => applyAlbum(e.target.value)}
            aria-label="Albüme göre filtrele"
            className="appearance-none pl-8 pr-8 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-xs text-zinc-100 outline-none hover:border-zinc-600 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 transition-colors min-w-[200px]"
          >
            <option value="">Tüm albümler</option>
            {albumOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <span
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-[11px] pointer-events-none"
            aria-hidden="true"
          >
            ♫
          </span>
          <span
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px] pointer-events-none"
            aria-hidden="true"
          >
            ▾
          </span>
        </div>
        <button
          type="button"
          onClick={toggleDeepCut}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border ${
            deepCutOnly
              ? 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40'
              : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-600'
          }`}
          aria-pressed={deepCutOnly}
        >
          Deep Cut {deepCutOnly && <span aria-hidden="true">✓</span>}
        </button>
      </div>

      <BulkActionBar
        count={sel.count}
        itemLabel="şarkı"
        endpoint="/api/songs/bulk-delete"
        ids={sel.ids}
        onCleared={onBulkCleared}
      />

      {loading ? (
        <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
          {Array.from({ length: PER_PAGE }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/60 last:border-b-0"
            >
              <div className="w-4 h-3 bg-zinc-800/60 rounded animate-pulse" />
              <div className="w-10 h-10 bg-zinc-800/60 rounded animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-zinc-800/60 rounded animate-pulse w-2/5" />
                <div className="h-2.5 bg-zinc-800/60 rounded animate-pulse w-1/4" />
              </div>
              <div className="w-12 h-2.5 bg-zinc-800/60 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : songs.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/40 rounded-lg border border-zinc-800">
          <p className="text-sm text-zinc-100 font-medium">Şarkı bulunamadı</p>
          <p className="text-xs text-zinc-500 mt-1">Filtreyi temizle veya yeni şarkı ekle</p>
        </div>
      ) : (
        <>
          <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
            {/* Header — hidden on mobile, columns visible on lg+ */}
            <div className="hidden lg:grid grid-cols-[28px_40px_56px_minmax(0,2fr)_minmax(0,1.4fr)_72px_88px_120px] gap-3 items-center px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
              <BulkCheckbox
                checked={sel.allSelected}
                indeterminate={sel.someSelected}
                onChange={() => sel.toggleAllOnPage(pageIds)}
                ariaLabel="Sayfadaki tüm şarkıları seç"
              />
              <span className="text-center">#</span>
              <span></span>
              <span>Başlık</span>
              <span>Albüm · Sanatçı</span>
              <span className="text-right pr-1">Süre</span>
              <span>Bağlantı</span>
              <span className="text-right">İşlemler</span>
            </div>

            <ul className="divide-y divide-zinc-800/60">
              {songs.map((s) => {
                const isChecked = sel.isSelected(s.id);
                return (
                  <li
                    key={s.id}
                    className={`group grid grid-cols-[28px_40px_56px_minmax(0,1fr)_auto] lg:grid-cols-[28px_40px_56px_minmax(0,2fr)_minmax(0,1.4fr)_72px_88px_120px] gap-3 items-center px-4 py-2.5 transition-colors ${
                      isChecked ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-zinc-800/30'
                    }`}
                  >
                    {/* Selection checkbox */}
                    <BulkCheckbox
                      checked={isChecked}
                      onChange={() => sel.toggle(s.id)}
                      ariaLabel={`${s.title} seç`}
                    />

                    {/* Track number */}
                    <span className="text-center text-[11px] text-zinc-500 font-mono group-hover:text-zinc-300 tabular-nums">
                      {s.trackNumber ?? '—'}
                    </span>

                    {/* Cover */}
                    <Link
                      href={`/admin/songs/${s.id}`}
                      aria-label={`${s.title} düzenle`}
                      className="block w-11 h-11 rounded overflow-hidden bg-zinc-800 ring-1 ring-zinc-800 group-hover:ring-zinc-700 transition-all"
                    >
                      {s.album?.coverImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={s.album.coverImage}
                          alt={s.album.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-base">
                          ♫
                        </div>
                      )}
                    </Link>

                    {/* Title (+ deep cut + mobile-only album info) */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Link
                          href={`/admin/songs/${s.id}`}
                          className="text-sm font-medium text-zinc-100 truncate hover:text-white transition-colors"
                        >
                          {s.title}
                        </Link>
                        {s.isDeepCut && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20 text-[9px] font-bold uppercase tracking-wider">
                            Deep Cut
                          </span>
                        )}
                      </div>
                      {/* mobile: stack album/artist under title */}
                      <p className="lg:hidden text-[11px] text-zinc-500 truncate mt-0.5">
                        {s.album?.title || '—'}
                        {s.album?.artist?.name && (
                          <span className="text-zinc-600"> · {s.album.artist.name}</span>
                        )}
                      </p>
                    </div>

                    {/* Album · Artist (lg+) */}
                    <div className="hidden lg:block min-w-0 text-[11px]">
                      {s.album ? (
                        <>
                          <p className="text-zinc-300 truncate">{s.album.title}</p>
                          <p className="text-zinc-500 truncate">{s.album.artist?.name || '—'}</p>
                        </>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </div>

                    {/* Duration (lg+) */}
                    <span className="hidden lg:block text-right pr-1 text-[11px] text-zinc-500 font-mono tabular-nums">
                      {s.duration || '—'}
                    </span>

                    {/* Links (lg+) */}
                    <div className="hidden lg:flex items-center gap-1">
                      {s.spotifyUrl && (
                        <a
                          href={s.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Spotify'da aç"
                          className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[9px] font-bold hover:bg-emerald-500/20 transition-colors"
                        >
                          SP
                        </a>
                      )}
                      {s.youtubeUrl && (
                        <a
                          href={s.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="YouTube'da aç"
                          className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20 text-[9px] font-bold hover:bg-red-500/20 transition-colors"
                        >
                          YT
                        </a>
                      )}
                      {!s.spotifyUrl && !s.youtubeUrl && (
                        <span className="text-zinc-700 text-[10px]">—</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1">
                      {/* Mobile-only inline link icons since the SP/YT pills are hidden */}
                      {(s.spotifyUrl || s.youtubeUrl) && (
                        <div className="lg:hidden flex items-center gap-0.5 mr-1">
                          {s.spotifyUrl && (
                            <a
                              href={s.spotifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Spotify"
                              className="text-emerald-300 hover:text-emerald-200 w-6 h-6 flex items-center justify-center text-[10px] font-bold"
                            >
                              SP
                            </a>
                          )}
                          {s.youtubeUrl && (
                            <a
                              href={s.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="YouTube"
                              className="text-red-300 hover:text-red-200 w-6 h-6 flex items-center justify-center text-[10px] font-bold"
                            >
                              YT
                            </a>
                          )}
                        </div>
                      )}
                      {s.album && (
                        <Link
                          href={`/admin/albums/${s.album.id}`}
                          title="Albümü aç"
                          aria-label="Albümü aç"
                          className="hidden lg:flex text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 w-7 h-7 rounded-md items-center justify-center transition-colors"
                        >
                          <IconExternal size={12} />
                        </Link>
                      )}
                      <Link
                        href={`/admin/songs/${s.id}`}
                        className="text-zinc-300 hover:text-white hover:bg-zinc-800 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
                      >
                        Düzenle
                      </Link>
                      <DeleteButton
                        endpoint={`/api/songs/${s.id}`}
                        confirmMessage={`"${s.title}" şarkısını silmek istediğinizden emin misiniz?`}
                        onDeleted={reload}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
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
