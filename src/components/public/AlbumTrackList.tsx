'use client';

/**
 * Albüm sayfası track listesi — her şarkı için expand/collapse açılır
 * bir blok içinde Spotify ve YouTube embed player'ları ile şarkı açıklaması
 * (descriptionTr/En) gösterir.
 *
 * Performans notu: iframe'ler "facade pattern" ile çalışır — kullanıcı
 * şarkıyı genişletene kadar iframe DOM'a basılmaz. Bu, sayfa başına
 * 20-30 player yüklenmesini engeller; sayfa hızlı kalır.
 *
 * Telif notu: Player'lar Spotify ve YouTube'un resmi embed URL'lerini
 * kullanır — şarkıyı biz host etmiyoruz, sadece servis sağlayıcının
 * iframe'ini gömüyoruz.
 */

import { useState } from 'react';
import { toSpotifyEmbedUrl, toYouTubeEmbedUrl } from '@/lib/embed-urls';

interface TrackSong {
  id: string;
  title: string;
  trackNumber: number | null;
  duration: string | null;
  isDeepCut: boolean;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  descriptionTr: string | null;
  descriptionEn: string | null;
}

interface Props {
  songs: TrackSong[];
  locale: string;
  labels: {
    deepCut: string;
    expand: string;
    collapse: string;
    about: string;
    listenOnSpotify: string;
    listenOnYouTube: string;
  };
}

export default function AlbumTrackList({ songs, locale, labels }: Props) {
  const tr = locale === 'tr';
  // İlk render'da hiçbir şarkı açık değil — performans için lazy. Kullanıcı
  // bir şarkıyı genişletirse içine embed iframe(ler) basılır.
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ol className="border-t border-white/10">
      {songs.map((song, idx) => {
        const description = tr ? song.descriptionTr : song.descriptionEn;
        const spotifyEmbed = toSpotifyEmbedUrl(song.spotifyUrl);
        const youtubeEmbed = toYouTubeEmbedUrl(song.youtubeUrl);
        // Genişletilebilir = açıklama var VEYA player olarak gömülebilen
        // bir link var. Sadece raw link varsa expand etmenin anlamı yok.
        const hasExpandable = Boolean(description || spotifyEmbed || youtubeEmbed);
        const isOpen = openId === song.id;

        return (
          <li key={song.id} className="border-b border-white/10">
            <div
              className={`flex items-center gap-5 py-4 transition-colors ${
                hasExpandable
                  ? 'cursor-pointer hover:bg-white/[0.03]'
                  : 'hover:bg-white/[0.02]'
              }`}
              onClick={() => {
                if (!hasExpandable) return;
                setOpenId(isOpen ? null : song.id);
              }}
              role={hasExpandable ? 'button' : undefined}
              aria-expanded={hasExpandable ? isOpen : undefined}
              aria-controls={hasExpandable ? `track-${song.id}` : undefined}
              tabIndex={hasExpandable ? 0 : undefined}
              onKeyDown={(e) => {
                if (!hasExpandable) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setOpenId(isOpen ? null : song.id);
                }
              }}
            >
              <span className="text-zinc-600 text-[11px] font-mono w-8 flex-shrink-0">
                {String(song.trackNumber ?? idx + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 truncate">{song.title}</p>
                {song.isDeepCut && (
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-semibold mt-0.5 inline-block">
                    {labels.deepCut}
                  </span>
                )}
              </div>
              <div className="flex gap-4 text-[11px] flex-shrink-0 items-center uppercase tracking-wider font-semibold">
                {song.duration && (
                  <span className="text-zinc-500 font-mono normal-case tracking-normal font-normal">
                    {song.duration}
                  </span>
                )}
                {hasExpandable && (
                  <span
                    className="text-zinc-500 transition-transform"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                )}
              </div>
            </div>
            {hasExpandable && isOpen && (
              <div
                id={`track-${song.id}`}
                className="pb-6 pt-2 pl-13 pr-2 space-y-4"
              >
                {description && (
                  <div>
                    <p className="text-zinc-500 text-[10px] tracking-[0.3em] uppercase font-bold mb-2">
                      {labels.about}
                    </p>
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                      {description}
                    </p>
                  </div>
                )}
                {(spotifyEmbed || youtubeEmbed) && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {spotifyEmbed && (
                      <iframe
                        src={spotifyEmbed}
                        title={`Spotify · ${song.title}`}
                        loading="lazy"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        className="w-full rounded-lg border-0"
                        style={{ height: 152 }}
                      />
                    )}
                    {youtubeEmbed && (
                      <div
                        className="relative w-full overflow-hidden rounded-lg"
                        style={{ paddingTop: '56.25%' }}
                      >
                        <iframe
                          src={youtubeEmbed}
                          title={`YouTube · ${song.title}`}
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full border-0"
                        />
                      </div>
                    )}
                  </div>
                )}
                {/* Raw "Spotify ↗ / YouTube ↗" linkleri: embed iframe
                    gizli olsa bile (örn. mobilde) kullanıcı dış servise
                    geçebilsin. */}
                <div className="flex gap-4 text-[11px] uppercase tracking-wider font-semibold">
                  {song.spotifyUrl && (
                    <a
                      href={song.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      {labels.listenOnSpotify} ↗
                    </a>
                  )}
                  {song.youtubeUrl && (
                    <a
                      href={song.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      {labels.listenOnYouTube} ↗
                    </a>
                  )}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
