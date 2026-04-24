'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/admin/Toast';
import { useConfirm } from '@/components/admin/useConfirm';

/**
 * Inline song manager shown on the album edit page.
 *
 * Lets editors add, edit, and remove songs without leaving the album detail.
 * Songs are added through the dedicated /api/songs route and PATCH through
 * /api/songs/[id]. Full song editing (URLs, deep cut flag, etc.) is handled
 * on the dedicated /admin/songs/[id] form — this component is optimized for
 * quick tracklist entry.
 */

interface Song {
  id: string;
  title: string;
  trackNumber: number | null;
  duration: string | null;
  isDeepCut: boolean;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
}

export default function AlbumSongs({
  albumId,
  reloadToken,
  onChanged,
}: {
  albumId: string;
  reloadToken: number;
  onChanged: () => void;
}) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: '', trackNumber: '', duration: '' });
  const { toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    // We don't reset loading on reload — stale data stays visible until the
    // next fetch resolves, which is a smoother UX than flashing the skeleton.
    let cancelled = false;
    fetch(`/api/songs?albumId=${albumId}&all=true`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setSongs(Array.isArray(d) ? d : d.items || []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [albumId, reloadToken]);

  const addSong = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!draft.title.trim()) return;
      setAdding(true);
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title.trim(),
          albumId,
          trackNumber: draft.trackNumber ? Number(draft.trackNumber) : null,
          duration: draft.duration || null,
        }),
      });
      const data = await res.json();
      setAdding(false);
      if (!res.ok) {
        toast(data.error || 'Şarkı eklenemedi', 'error');
        return;
      }
      toast('Şarkı eklendi');
      setDraft({ title: '', trackNumber: '', duration: '' });
      onChanged();
    },
    [albumId, draft, onChanged, toast],
  );

  const removeSong = useCallback(
    async (song: Song) => {
      const ok = await confirm({
        title: 'Şarkı sil',
        description: `"${song.title}"`,
        confirmLabel: 'Sil',
      });
      if (!ok) return;
      const res = await fetch(`/api/songs/${song.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Silinemedi', 'error');
        return;
      }
      toast('Silindi');
      onChanged();
    },
    [confirm, onChanged, toast],
  );

  const suggestedTrack =
    songs.length > 0
      ? Math.max(...songs.map((s) => s.trackNumber ?? 0)) + 1
      : 1;

  return (
    <div className="space-y-4">
      {confirmDialog}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Şarkılar</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Bu albümdeki parçaları yönet. Ek alanlar (Spotify, YouTube, Deep Cut) için şarkıyı aç.
          </p>
        </div>
        <span className="text-[11px] text-zinc-500">{songs.length} parça</span>
      </div>

      {loading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 bg-zinc-800/60 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-md overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-500">
                <th className="text-left px-3 py-2 w-10 font-medium">#</th>
                <th className="text-left px-3 py-2 font-medium">Başlık</th>
                <th className="text-left px-3 py-2 w-20 font-medium">Süre</th>
                <th className="text-left px-3 py-2 w-20 font-medium">Etiket</th>
                <th className="text-right px-3 py-2 w-28 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {songs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                    Henüz parça yok. Aşağıdan ekleyebilirsiniz.
                  </td>
                </tr>
              )}
              {songs.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-900/60 transition-colors">
                  <td className="px-3 py-2 text-zinc-500">{s.trackNumber ?? '—'}</td>
                  <td className="px-3 py-2 text-zinc-100 font-medium">{s.title}</td>
                  <td className="px-3 py-2 text-zinc-400 font-mono">{s.duration || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {s.isDeepCut && (
                        <span className="px-1.5 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-300 text-[9px] font-bold uppercase tracking-wider border border-fuchsia-500/20">
                          Deep
                        </span>
                      )}
                      {s.spotifyUrl && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[9px] font-bold border border-emerald-500/20">
                          SP
                        </span>
                      )}
                      {s.youtubeUrl && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 text-[9px] font-bold border border-red-500/20">
                          YT
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/songs/${s.id}`}
                        className="text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors"
                      >
                        Aç
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeSong(s)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        onSubmit={addSong}
        className="grid grid-cols-[60px_1fr_90px_auto] gap-2 items-end pt-3 border-t border-zinc-800/80"
      >
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 mb-1 uppercase tracking-wider">
            #
          </label>
          <input
            type="number"
            value={draft.trackNumber}
            onChange={(e) => setDraft((d) => ({ ...d, trackNumber: e.target.value }))}
            placeholder={String(suggestedTrack)}
            min={1}
            className="w-full px-2 py-1.5 text-xs text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-md outline-none hover:border-zinc-700 focus:border-zinc-500 placeholder:text-zinc-600"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 mb-1 uppercase tracking-wider">
            Yeni Şarkı
          </label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Parça adı"
            className="w-full px-2 py-1.5 text-xs text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-md outline-none hover:border-zinc-700 focus:border-zinc-500 placeholder:text-zinc-600"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 mb-1 uppercase tracking-wider">
            Süre
          </label>
          <input
            type="text"
            value={draft.duration}
            onChange={(e) => setDraft((d) => ({ ...d, duration: e.target.value }))}
            placeholder="4:32"
            className="w-full px-2 py-1.5 text-xs text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-md outline-none hover:border-zinc-700 focus:border-zinc-500 placeholder:text-zinc-600"
          />
        </div>
        <button
          type="submit"
          disabled={adding || !draft.title.trim()}
          className="px-3 py-1.5 bg-white text-zinc-950 text-xs font-semibold rounded-md hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {adding ? 'Ekleniyor…' : '+ Ekle'}
        </button>
      </form>
    </div>
  );
}
