'use client';

/**
 * Public şarkı keşif sayfası için filtre + liste UI'ı. Server tarafı
 * tüm yayındaki şarkıları AlbumTrackList'in beklediği şekille hazırlayıp
 * bu bileşene veriyor; biz client-side arama + Deep Cut toggle + sanatçı
 * dropdown'u uyguluyoruz.
 *
 * Tüm filtreler client-side — şarkı sayısı 1000'lere ulaşana kadar
 * tek seferlik fetch + JS filter yeterli, URL state'i basit kalır.
 */

import { useMemo, useState } from 'react';
import AlbumTrackList from './AlbumTrackList';

interface SongItem {
  id: string;
  title: string;
  trackNumber: number | null;
  duration: string | null;
  isDeepCut: boolean;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  descriptionTr: string | null;
  descriptionEn: string | null;
  album: {
    title: string;
    slug: string;
    artist: { id: string; name: string; slug: string };
  };
}

interface Props {
  songs: SongItem[];
  locale: string;
  labels: {
    deepCut: string;
    expand: string;
    collapse: string;
    about: string;
    listenOnSpotify: string;
    listenOnYouTube: string;
    openAlbum: string;
    searchPlaceholder: string;
    deepCutsOnly: string;
    allArtists: string;
    noResults: string;
  };
}

export default function SongExplorer({ songs, locale, labels }: Props) {
  const [query, setQuery] = useState('');
  const [deepCutsOnly, setDeepCutsOnly] = useState(false);
  const [artistId, setArtistId] = useState<string>('');

  // Sanatçı dropdown'u için unique listeyi türet — aynı sanatçının birden
  // fazla şarkısı varsa tek satır gözüksün.
  const artists = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const s of songs) {
      if (!map.has(s.album.artist.id)) {
        map.set(s.album.artist.id, {
          id: s.album.artist.id,
          name: s.album.artist.name,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, locale === 'tr' ? 'tr' : 'en'),
    );
  }, [songs, locale]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return songs.filter((s) => {
      if (deepCutsOnly && !s.isDeepCut) return false;
      if (artistId && s.album.artist.id !== artistId) return false;
      if (q) {
        const hay = `${s.title} ${s.album.title} ${s.album.artist.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [songs, query, deepCutsOnly, artistId]);

  return (
    <div className="space-y-6">
      {/* Filtre satırı — minimal editöryal şerit. Mobile'da wrap olur. */}
      <div className="flex gap-3 flex-wrap items-center bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.searchPlaceholder}
          aria-label={labels.searchPlaceholder}
          className="flex-1 min-w-[200px] px-3 py-1.5 bg-black/40 border border-white/10 hover:border-white/20 focus:border-white/40 rounded-md text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-white/10 transition-colors"
        />
        {artists.length > 1 && (
          <select
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            aria-label={labels.allArtists}
            className="px-3 py-1.5 bg-black/40 border border-white/10 hover:border-white/20 focus:border-white/40 rounded-md text-sm text-white outline-none focus:ring-2 focus:ring-white/10 transition-colors min-w-[160px]"
          >
            <option value="">{labels.allArtists}</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
        <label className="inline-flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={deepCutsOnly}
            onChange={(e) => setDeepCutsOnly(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-600 bg-black/40 accent-white"
          />
          <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-300">
            {labels.deepCutsOnly}
          </span>
        </label>
        <span className="text-[11px] text-zinc-500 ml-auto">
          {filtered.length} / {songs.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 text-sm">
          {labels.noResults}
        </div>
      ) : (
        <AlbumTrackList
          songs={filtered}
          locale={locale}
          showTrackNumbers={false}
          labels={{
            deepCut: labels.deepCut,
            expand: labels.expand,
            collapse: labels.collapse,
            about: labels.about,
            listenOnSpotify: labels.listenOnSpotify,
            listenOnYouTube: labels.listenOnYouTube,
            openAlbum: labels.openAlbum,
          }}
        />
      )}
    </div>
  );
}
