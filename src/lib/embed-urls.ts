/**
 * Spotify / YouTube track URL'lerinden embed URL üretme yardımcıları.
 *
 * Telif: Şarkı dosyalarını biz host etmiyoruz — sadece servis sağlayıcının
 * resmi iframe player'ını gömüyoruz. Spotify/YouTube'un kendi telif
 * sözleşmeleri devrede; biz sadece <iframe> ile linkliyoruz.
 */

/**
 * Spotify track URL'inden embed URL üretir.
 *
 * Kabul edilen format:
 *   - https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc
 *   - https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc?si=abc
 *   - intl-tr/track/... gibi locale prefix'leri olabiliyor
 *
 * URL parse edilemezse null döner (caller fallback link gösterir).
 */
export function toSpotifyEmbedUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl.trim());
    if (!/(^|\.)spotify\.com$/i.test(url.hostname)) return null;
    // Path "track/{id}" varyantlarını yakala. Spotify bazen "/intl-tr/track/..."
    // gibi locale prefix ekliyor; en sondaki "track/{id}" segmentini al.
    const match = url.pathname.match(/\/track\/([A-Za-z0-9]+)/);
    if (!match) return null;
    return `https://open.spotify.com/embed/track/${match[1]}`;
  } catch {
    return null;
  }
}

/**
 * YouTube watch URL'inden embed URL üretir.
 *
 * Kabul edilen formatlar:
 *   - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 *   - https://youtube.com/watch?v=dQw4w9WgXcQ
 *   - https://youtu.be/dQw4w9WgXcQ
 *   - https://m.youtube.com/watch?v=...
 *   - https://www.youtube.com/embed/dQw4w9WgXcQ  (zaten embed)
 *
 * URL parse edilemezse null döner.
 */
export function toYouTubeEmbedUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.toLowerCase();
    let videoId: string | null = null;

    if (host === 'youtu.be') {
      videoId = url.pathname.slice(1) || null;
    } else if (/^(www\.|m\.)?youtube\.com$/.test(host)) {
      videoId = url.searchParams.get('v');
      if (!videoId) {
        const embedMatch = url.pathname.match(/\/embed\/([A-Za-z0-9_-]+)/);
        if (embedMatch) videoId = embedMatch[1];
      }
    }

    if (!videoId) return null;
    // Sanity check: YouTube id'leri tipik 11 karakter, A-Z a-z 0-9 _-
    if (!/^[A-Za-z0-9_-]{6,15}$/.test(videoId)) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return null;
  }
}
