'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/admin/Toast';

/**
 * Item manager for a listening path. Lets editors add/remove/reorder/annotate
 * the songs, albums, or artists that make up the route.
 *
 * Reordering is implemented with simple up/down buttons (no drag-and-drop
 * library dependency). Each move sends a PATCH with the full orderedIds[].
 */

type ItemKind = 'song' | 'album' | 'artist';

interface PathItem {
  id: string;
  order: number;
  noteTr: string | null;
  noteEn: string | null;
  song: { id: string; title: string; album: { title: string } | null } | null;
  album: { id: string; title: string } | null;
  artist: { id: string; name: string } | null;
}

interface SongOption {
  id: string;
  title: string;
  album: { title: string; artist: { name: string } } | null;
}
interface AlbumOption {
  id: string;
  title: string;
  artist?: { name: string };
}
interface ArtistOption {
  id: string;
  name: string;
}

function describeItem(item: PathItem): { kind: ItemKind; label: string; sub: string } {
  if (item.song) {
    return {
      kind: 'song',
      label: item.song.title,
      sub: item.song.album?.title || 'Şarkı',
    };
  }
  if (item.album) {
    return { kind: 'album', label: item.album.title, sub: 'Albüm' };
  }
  if (item.artist) {
    return { kind: 'artist', label: item.artist.name, sub: 'Sanatçı' };
  }
  return { kind: 'song', label: '—', sub: '' };
}

export default function ListeningPathItems({ pathId }: { pathId: string }) {
  const [items, setItems] = useState<PathItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [kind, setKind] = useState<ItemKind>('song');
  const [selectedId, setSelectedId] = useState('');
  const [noteTr, setNoteTr] = useState('');
  const [noteEn, setNoteEn] = useState('');
  const [adding, setAdding] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [songs, setSongs] = useState<SongOption[]>([]);
  const [albums, setAlbums] = useState<AlbumOption[]>([]);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const { toast } = useToast();

  // Load items — stale list stays visible on reload while new data loads.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/listening-paths/${pathId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setItems(Array.isArray(d.items) ? d.items : []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathId, reloadToken]);

  // Load entity options once
  useEffect(() => {
    Promise.all([
      fetch('/api/songs?all=true').then((r) => r.json()),
      fetch('/api/albums?page=1&limit=500').then((r) => r.json()),
      fetch('/api/artists?all=true').then((r) => r.json()),
    ]).then(([songList, albumList, artistList]) => {
      setSongs(Array.isArray(songList) ? songList : songList.items || []);
      setAlbums(Array.isArray(albumList) ? albumList : albumList.items || []);
      setArtists(Array.isArray(artistList) ? artistList : artistList.items || []);
    });
  }, []);

  const options = useMemo(() => {
    if (kind === 'song') {
      return songs.map((s) => ({
        id: s.id,
        label: `${s.title}${s.album?.title ? ' — ' + s.album.title : ''}${
          s.album?.artist?.name ? ' · ' + s.album.artist.name : ''
        }`,
      }));
    }
    if (kind === 'album') {
      return albums.map((a) => ({
        id: a.id,
        label: `${a.title}${a.artist?.name ? ' · ' + a.artist.name : ''}`,
      }));
    }
    return artists.map((a) => ({ id: a.id, label: a.name }));
  }, [kind, songs, albums, artists]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  const handleKindChange = useCallback((k: ItemKind) => {
    setKind(k);
    setSelectedId('');
  }, []);

  const addItem = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedId) return;
      setAdding(true);
      const payload: Record<string, string | undefined> = {
        noteTr: noteTr || undefined,
        noteEn: noteEn || undefined,
      };
      if (kind === 'song') payload.songId = selectedId;
      else if (kind === 'album') payload.albumId = selectedId;
      else payload.artistId = selectedId;

      const res = await fetch(`/api/listening-paths/${pathId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setAdding(false);
      if (!res.ok) {
        toast(data.error || 'Eklenemedi', 'error');
        return;
      }
      toast('Rotaya eklendi');
      setSelectedId('');
      setNoteTr('');
      setNoteEn('');
      reload();
    },
    [kind, pathId, selectedId, noteTr, noteEn, reload, toast],
  );

  const removeItem = useCallback(
    async (item: PathItem) => {
      const { label } = describeItem(item);
      if (!window.confirm(`"${label}" rotadan çıkarılsın mı?`)) return;
      const res = await fetch(`/api/listening-paths/${pathId}/items/${item.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Çıkarılamadı', 'error');
        return;
      }
      toast('Çıkarıldı');
      reload();
    },
    [pathId, reload, toast],
  );

  const moveItem = useCallback(
    async (itemId: string, direction: -1 | 1) => {
      const idx = items.findIndex((i) => i.id === itemId);
      if (idx < 0) return;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= items.length) return;

      const reordered = [...items];
      [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
      setItems(reordered);
      setReordering(true);

      const res = await fetch(`/api/listening-paths/${pathId}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((i) => i.id) }),
      });
      setReordering(false);
      if (!res.ok) {
        toast('Sıralama kaydedilemedi', 'error');
        reload();
      }
    },
    [items, pathId, reload, toast],
  );

  const saveNotes = useCallback(
    async (item: PathItem, updates: { noteTr?: string; noteEn?: string }) => {
      setSavingNoteId(item.id);
      const res = await fetch(`/api/listening-paths/${pathId}/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setSavingNoteId(null);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || 'Not kaydedilemedi', 'error');
        return;
      }
      toast('Not kaydedildi');
      setItems((curr) =>
        curr.map((i) =>
          i.id === item.id
            ? {
                ...i,
                noteTr: updates.noteTr !== undefined ? updates.noteTr || null : i.noteTr,
                noteEn: updates.noteEn !== undefined ? updates.noteEn || null : i.noteEn,
              }
            : i,
        ),
      );
    },
    [pathId, toast],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Rota Öğeleri</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Bu dinleme rotasının parçalarını, albümlerini veya sanatçılarını sırala ve notlandır.
          </p>
        </div>
        <span className="text-[11px] text-zinc-500">
          {items.length} öğe{reordering ? ' · sıralama kaydediliyor…' : ''}
        </span>
      </div>

      {loading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-zinc-800/60 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.length === 0 && (
            <li className="px-3 py-6 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-md">
              Henüz öğe yok. Aşağıdan şarkı, albüm veya sanatçı ekleyin.
            </li>
          )}
          {items.map((item, idx) => {
            const d = describeItem(item);
            return (
              <li
                key={item.id}
                className="border border-zinc-800 rounded-md p-3 bg-zinc-900/40 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => moveItem(item.id, -1)}
                      disabled={idx === 0 || reordering}
                      className="w-5 h-5 rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] flex items-center justify-center transition-colors"
                      aria-label="Yukarı taşı"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(item.id, 1)}
                      disabled={idx === items.length - 1 || reordering}
                      className="w-5 h-5 rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] flex items-center justify-center transition-colors"
                      aria-label="Aşağı taşı"
                    >
                      ▼
                    </button>
                  </div>
                  <span className="w-6 h-6 rounded-md bg-zinc-800 text-zinc-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                          d.kind === 'song'
                            ? 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                            : d.kind === 'album'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                              : 'bg-violet-500/10 text-violet-300 border-violet-500/20'
                        }`}
                      >
                        {d.kind === 'song' ? 'Şarkı' : d.kind === 'album' ? 'Albüm' : 'Sanatçı'}
                      </span>
                      <span className="text-xs font-medium text-zinc-100 truncate">{d.label}</span>
                      <span className="text-[10px] text-zinc-500 truncate">{d.sub}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        defaultValue={item.noteTr || ''}
                        placeholder="Not (TR)"
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v !== (item.noteTr || '')) saveNotes(item, { noteTr: v });
                        }}
                        className="w-full px-2 py-1 text-[11px] text-zinc-100 bg-zinc-950 border border-zinc-800 rounded outline-none hover:border-zinc-700 focus:border-zinc-500 placeholder:text-zinc-600"
                      />
                      <input
                        type="text"
                        defaultValue={item.noteEn || ''}
                        placeholder="Note (EN)"
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v !== (item.noteEn || '')) saveNotes(item, { noteEn: v });
                        }}
                        className="w-full px-2 py-1 text-[11px] text-zinc-100 bg-zinc-950 border border-zinc-800 rounded outline-none hover:border-zinc-700 focus:border-zinc-500 placeholder:text-zinc-600"
                      />
                    </div>
                    {savingNoteId === item.id && (
                      <p className="text-[10px] text-zinc-500 mt-1">Not kaydediliyor…</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-0.5 rounded-md text-[11px] font-medium flex-shrink-0 transition-colors"
                  >
                    Çıkar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        onSubmit={addItem}
        className="pt-4 border-t border-zinc-800/80 space-y-2.5"
      >
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Yeni Öğe
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(['song', 'album', 'artist'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => handleKindChange(k)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                kind === k
                  ? 'bg-white text-zinc-950'
                  : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {k === 'song' ? 'Şarkı' : k === 'album' ? 'Albüm' : 'Sanatçı'}
            </button>
          ))}
        </div>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full px-3 py-2 text-xs text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-md outline-none hover:border-zinc-700 focus:border-zinc-500"
        >
          <option value="">Seçiniz…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={noteTr}
            onChange={(e) => setNoteTr(e.target.value)}
            placeholder="Not (TR) — opsiyonel"
            className="w-full px-3 py-1.5 text-xs text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-md outline-none hover:border-zinc-700 focus:border-zinc-500 placeholder:text-zinc-600"
          />
          <input
            type="text"
            value={noteEn}
            onChange={(e) => setNoteEn(e.target.value)}
            placeholder="Note (EN) — optional"
            className="w-full px-3 py-1.5 text-xs text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-md outline-none hover:border-zinc-700 focus:border-zinc-500 placeholder:text-zinc-600"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={adding || !selectedId}
            className="px-4 py-1.5 bg-white text-zinc-950 text-xs font-semibold rounded-md hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {adding ? 'Ekleniyor…' : '+ Ekle'}
          </button>
        </div>
      </form>
    </div>
  );
}
