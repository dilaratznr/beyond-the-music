'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { IconUpload, IconArtist, IconAlbum, IconSong, IconExternal } from '@/components/admin/Icons';

interface ArtistOption {
  id: string;
  name: string;
}

interface SongPlan {
  action: 'create' | 'update' | 'skip';
  title: string;
  trackNumber: number | null;
  duration: string | null;
  isDeepCut: boolean;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
}
interface AlbumPlan {
  action: 'create' | 'update' | 'skip';
  title: string;
  slug: string;
  releaseDate: string | null;
  coverImage: string | null;
  songs: SongPlan[];
}
interface Preview {
  artist: { id: string; name: string };
  plan: AlbumPlan[];
  summary: {
    albumsToCreate: number;
    albumsToUpdate: number;
    songsToCreate: number;
    songsToSkip: number;
  };
}

const SAMPLE_CSV = `album_title,album_year,album_cover,track_number,song_title,duration,is_deep_cut,spotify_url,youtube_url
Astronot,2010,https://example.com/astronot.jpg,1,Hayalkırıklığı Hikâyeleri,3:42,false,,
Astronot,2010,,2,Şehir,4:05,false,,
Astronot,2010,,3,Astronot,5:20,true,,
Hep Sonradan,2003,,1,Bir İhtimal,3:50,false,,
Hep Sonradan,2003,,2,Söz,4:10,false,,`;

/**
 * CSV import page. Two stages:
 *   1. Artist + CSV input. We send the CSV to the server with
 *      dryRun=true to validate and produce a row-by-row plan.
 *   2. Preview. The user sees what would change and clicks "İçe aktar"
 *      to commit (same payload, dryRun=false).
 *
 * Design choices:
 *  - The artist is fixed at the page level so the CSV doesn't need
 *    to repeat the artist column on every row (matches the user's
 *    stated workflow: "I'm adding ONE artist's discography").
 *  - The page also offers per-resource "CSV indir" links (handled in
 *    each list page itself); this screen is just the import side.
 */
export default function ImportPage() {
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [artistId, setArtistId] = useState('');
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{ row: number; message: string }[] | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [committed, setCommitted] = useState<Preview['summary'] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/artists?page=1&limit=500')
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : d.items || [];
        setArtists(list.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })));
      })
      .catch(() => {
        setError('Sanatçı listesi yüklenemedi.');
      });
  }, []);

  const onFile = useCallback(async (file: File) => {
    const text = await file.text();
    setCsv(text);
    setPreview(null);
    setCommitted(null);
    setError(null);
    setErrorDetails(null);
  }, []);

  async function runDryRun() {
    if (!artistId) {
      setError('Önce sanatçı seç.');
      return;
    }
    if (!csv.trim()) {
      setError('CSV içeriği boş.');
      return;
    }
    setBusy(true);
    setError(null);
    setErrorDetails(null);
    setCommitted(null);
    try {
      const res = await fetch('/api/admin/import/discography', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId, csv, dryRun: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Önizleme başarısız');
        if (Array.isArray(data?.details)) setErrorDetails(data.details);
        setPreview(null);
        return;
      }
      setPreview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Önizleme başarısız');
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!preview) return;
    if (
      !window.confirm(
        `${preview.summary.albumsToCreate} albüm ve ${preview.summary.songsToCreate} şarkı oluşturulacak. Devam edilsin mi?`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/import/discography', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId, csv, dryRun: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'İçe aktarma başarısız');
        return;
      }
      setCommitted(data.summary);
      setPreview(null);
      setCsv('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İçe aktarma başarısız');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPreview(null);
    setError(null);
    setErrorDetails(null);
    setCommitted(null);
  }

  const artistName = useMemo(
    () => artists.find((a) => a.id === artistId)?.name ?? '',
    [artists, artistId],
  );

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
          <IconUpload size={18} className="text-zinc-400" />
          CSV İçe Aktar
        </h1>
        <p className="text-[13px] text-zinc-500 mt-0.5">
          Bir sanatçının diskografisini tek seferde ekle. CSV&apos;yi yapıştır veya dosya yükle.
        </p>
      </div>

      {/* Top: per-list CSV download shortcuts. These deliberately use
          native <a> because the targets are API routes that return CSV
          files — we want a plain browser download, not a Next.js
          client-side route transition. */}
      <div className="mb-5 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-2">Dışa Aktar</p>
        <div className="flex flex-wrap gap-2">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/admin/export/albums"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <IconAlbum size={12} /> Albümler CSV
          </a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/admin/export/songs"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <IconSong size={12} /> Şarkılar CSV
          </a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/admin/export/articles"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <IconExternal size={12} /> Makaleler CSV
          </a>
          {artistId && (
            <a
              href={`/api/admin/export/albums?artistId=${artistId}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
            >
              <IconAlbum size={12} /> {artistName} CSV
            </a>
          )}
        </div>
      </div>

      {committed && (
        <div className="mb-4 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-[12px] text-emerald-200">
          <p className="font-semibold mb-1">İçe aktarma tamamlandı.</p>
          <p className="text-emerald-300/90">
            {committed.albumsToCreate} albüm + {committed.songsToCreate} şarkı eklendi.{' '}
            {committed.albumsToUpdate > 0 && `${committed.albumsToUpdate} albüm güncellendi. `}
            {committed.songsToSkip > 0 && `${committed.songsToSkip} şarkı zaten vardı, atlandı.`}
          </p>
          <div className="mt-2 flex gap-2">
            <Link
              href="/admin/albums"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 transition-colors"
            >
              Albümleri gör
            </Link>
            <button
              type="button"
              onClick={() => setCommitted(null)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              Yeni içe aktarma
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-[12px] text-rose-200">
          <p className="font-semibold mb-1">Hata: {error}</p>
          {errorDetails && errorDetails.length > 0 && (
            <ul className="list-disc list-inside space-y-0.5 text-rose-300/90 mt-1">
              {errorDetails.slice(0, 8).map((d, i) => (
                <li key={i}>
                  Satır {d.row}: {d.message}
                </li>
              ))}
              {errorDetails.length > 8 && (
                <li className="opacity-70">…ve {errorDetails.length - 8} hata daha</li>
              )}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Form */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">
              Sanatçı
            </label>
            <div className="relative">
              <select
                value={artistId}
                onChange={(e) => {
                  setArtistId(e.target.value);
                  setPreview(null);
                  setCommitted(null);
                }}
                className="w-full appearance-none pl-9 pr-8 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-100 outline-none hover:border-zinc-600 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 transition-colors"
              >
                <option value="">— Sanatçı seç —</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                <IconArtist size={14} />
              </span>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px] pointer-events-none">
                ▾
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-500">
                CSV İçeriği
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                  }}
                  className="hidden"
                  id="csv-file"
                />
                <label
                  htmlFor="csv-file"
                  className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                >
                  Dosya yükle
                </label>
                <button
                  type="button"
                  onClick={() => setCsv(SAMPLE_CSV)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                >
                  Örnek doldur
                </button>
                {csv && (
                  <button
                    type="button"
                    onClick={() => {
                      setCsv('');
                      setPreview(null);
                      if (fileRef.current) fileRef.current.value = '';
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-rose-300 transition-colors"
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={csv}
              onChange={(e) => {
                setCsv(e.target.value);
                setPreview(null);
              }}
              rows={14}
              spellCheck={false}
              placeholder="album_title,album_year,track_number,song_title,duration,is_deep_cut,spotify_url,youtube_url"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-[12px] text-zinc-100 font-mono outline-none hover:border-zinc-700 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-500/20 transition-colors resize-y"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runDryRun}
              disabled={busy || !artistId || !csv.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? 'Hazırlanıyor…' : 'Önizleme oluştur'}
            </button>
            {preview && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 transition-colors"
              >
                Önizlemeyi kapat
              </button>
            )}
          </div>
        </div>

        {/* Sidebar: format help */}
        <aside className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-900/40 border border-zinc-800 rounded-lg p-3 h-fit lg:sticky lg:top-3">
          <p className="font-semibold text-zinc-200 mb-2">CSV Biçimi</p>
          <p className="mb-2">
            İlk satır başlık olmalı. Şu sütunlar tanınır (sıra önemli değil):
          </p>
          <ul className="space-y-0.5 text-zinc-500">
            <li><code className="text-emerald-300">album_title</code> <span className="text-rose-400">*</span></li>
            <li><code>album_year</code></li>
            <li><code>album_cover</code></li>
            <li><code>track_number</code></li>
            <li><code>song_title</code></li>
            <li><code>duration</code></li>
            <li><code>is_deep_cut</code></li>
            <li><code>spotify_url</code></li>
            <li><code>youtube_url</code></li>
          </ul>
          <p className="mt-2.5 text-zinc-500">
            <span className="text-rose-400">*</span> zorunlu. Şarkı satırı boşsa &ldquo;sadece albüm&rdquo; eklenir. Aynı albüm tekrar import edilirse oluşturulmaz, yalnızca eksik şarkılar eklenir.
          </p>
        </aside>
      </div>

      {preview && (
        <div className="mt-6 border border-amber-500/30 rounded-lg bg-amber-500/5">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-500/20">
            <div>
              <h2 className="text-sm font-semibold text-amber-100">
                Önizleme — {preview.artist.name}
              </h2>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                <strong className="font-mono">{preview.summary.albumsToCreate}</strong> albüm oluşturulacak ·{' '}
                <strong className="font-mono">{preview.summary.songsToCreate}</strong> şarkı eklenecek
                {preview.summary.albumsToUpdate > 0 && (
                  <> · <strong className="font-mono">{preview.summary.albumsToUpdate}</strong> albüm güncellenecek</>
                )}
                {preview.summary.songsToSkip > 0 && (
                  <> · <strong className="font-mono">{preview.summary.songsToSkip}</strong> şarkı atlanacak</>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={commit}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-100 border border-emerald-500/40 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-wait transition-colors"
            >
              {busy ? 'İçe aktarılıyor…' : 'İçe aktar'}
            </button>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {preview.plan.map((album) => (
              <details
                key={album.slug}
                open
                className="group"
              >
                <summary className="flex items-center justify-between gap-3 px-4 py-2 cursor-pointer hover:bg-zinc-900/40 list-none">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                        album.action === 'create'
                          ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'
                          : 'bg-sky-500/15 text-sky-200 border-sky-500/30'
                      }`}
                    >
                      {album.action === 'create' ? 'YENİ' : 'GÜNCEL'}
                    </span>
                    <span className="text-[13px] font-medium text-zinc-100 truncate">{album.title}</span>
                    {album.releaseDate && (
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {new Date(album.releaseDate).getUTCFullYear()}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500 flex-shrink-0">
                    {album.songs.length} şarkı
                  </span>
                </summary>
                {album.songs.length > 0 && (
                  <ul className="px-4 pb-2 pt-0 space-y-0.5">
                    {album.songs.map((s, i) => (
                      <li
                        key={`${album.slug}-${i}`}
                        className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-1 rounded text-[11px] hover:bg-zinc-900/40"
                      >
                        <span className="text-center text-zinc-500 font-mono tabular-nums">
                          {s.trackNumber ?? '—'}
                        </span>
                        <span className="text-zinc-200 truncate">
                          {s.title}
                          {s.isDeepCut && (
                            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/20">
                              Deep
                            </span>
                          )}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                            s.action === 'create'
                              ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          {s.action === 'create' ? 'YENİ' : 'VAR'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
