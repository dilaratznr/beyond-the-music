'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { useToast } from '@/components/admin/Toast';
import ImageUploader from '@/components/admin/ImageUploader';
import { TableSkeleton } from '@/components/admin/Loading';
import { useConfirm } from '@/components/admin/useConfirm';

interface HeroVideo {
  id: string;
  url: string;
  duration: number;
  order: number;
  isActive: boolean;
  title: string | null;
}

const inputCls =
  'w-full px-3 py-2 text-sm text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-md outline-none transition-colors hover:border-zinc-700 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 placeholder:text-zinc-600';

export default function HeroVideosPage() {
  const [newUrl, setNewUrl] = useState('');
  const [newDuration, setNewDuration] = useState(10);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  // posterUrl: kullanıcı input'a yazarken local state, save sonrası
  // settings'ten gelen değer ile sync olur (savePoster içinde mutate).
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterSaving, setPosterSaving] = useState(false);
  const { toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const { data: videos = [], mutate: mutateVideos, isLoading: videosLoading } = useSWR<HeroVideo[]>(
    '/api/hero-videos',
  );
  const { data: settings, mutate: mutateSettings } = useSWR<Record<string, string>>(
    '/api/settings',
  );

  // posterUrl null ise henüz kullanıcı düzenlemedi, settings'ten derive et.
  // Düzenlediği anda setPosterUrl ile state'e geçiriyoruz (controlled input).
  const effectivePosterUrl = posterUrl ?? settings?.hero_poster_url ?? '';

  const loadVideos = useCallback(() => {
    mutateVideos();
  }, [mutateVideos]);

  async function savePoster(url: string) {
    setPosterSaving(true);
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hero_poster_url: url }),
    });
    setPosterSaving(false);
    if (res.ok) {
      // Local edit state'i temizle, SWR cache'inden derive olsun.
      setPosterUrl(null);
      mutateSettings();
      toast(url ? 'Arka plan görseli güncellendi' : 'Arka plan görseli kaldırıldı');
    } else {
      toast('Kaydetme hatası', 'error');
    }
  }

  async function addVideo() {
    if (!newUrl.trim()) return;
    setAdding(true);
    await fetch('/api/hero-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newUrl, duration: newDuration, title: newTitle || null }),
    });
    setNewUrl('');
    setNewDuration(10);
    setNewTitle('');
    setAdding(false);
    toast('Video eklendi');
    loadVideos();
  }

  async function toggleActive(v: HeroVideo) {
    await fetch('/api/hero-videos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: v.id, isActive: !v.isActive }),
    });
    toast(v.isActive ? 'Video pasife alındı' : 'Video aktif edildi');
    loadVideos();
  }

  async function updateDuration(v: HeroVideo, dur: number) {
    await fetch('/api/hero-videos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: v.id, duration: dur }),
    });
    toast('Süre güncellendi');
    loadVideos();
  }

  async function moveVideo(v: HeroVideo, dir: -1 | 1) {
    const idx = videos.findIndex((x) => x.id === v.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= videos.length) return;
    const swap = videos[swapIdx];
    await Promise.all([
      fetch('/api/hero-videos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: v.id, order: swap.order }),
      }),
      fetch('/api/hero-videos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: swap.id, order: v.order }),
      }),
    ]);
    toast('Sıralama güncellendi');
    loadVideos();
  }

  async function deleteVideo(id: string) {
    const ok = await confirm({
      title: 'Video sil',
      description: 'Bu hero videosu kaldırılacak.',
      confirmLabel: 'Sil',
    });
    if (!ok) return;
    await fetch(`/api/hero-videos?id=${id}`, { method: 'DELETE' });
    toast('Video silindi');
    loadVideos();
  }

  const activeCount = videos.filter((v) => v.isActive).length;
  const totalDuration = videos.filter((v) => v.isActive).reduce((sum, v) => sum + v.duration, 0);

  return (
    <div className="max-w-3xl">
      {confirmDialog}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Hero Videoları</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Ana sayfanın arka planı · {activeCount} aktif video · toplam {totalDuration}sn
          </p>
        </div>
      </div>

      {/* Poster / Fallback Image */}
      <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 p-5 mb-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Arka Plan Görseli
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
              Aktif video yokken veya videolar yüklenene kadar hero bölümünde gösterilir.
            </p>
          </div>
          {posterSaving && (
            <span className="text-[10px] text-zinc-500 italic">Kaydediliyor…</span>
          )}
        </div>
        {!settings ? (
          <div className="h-32 bg-zinc-800/40 rounded-lg animate-pulse" />
        ) : (
          <div className="max-w-sm">
            <ImageUploader
              value={effectivePosterUrl}
              onChange={(url) => savePoster(url || '')}
              category="hero"
              aspect="wide"
              label=""
              helperText="16:9 önerilir · JPG · PNG · WebP · max 5MB"
            />
          </div>
        )}
      </div>

      {/* Add new video */}
      <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 p-5 mb-5">
        <h2 className="text-sm font-semibold text-zinc-100 mb-3 tracking-tight">
          Yeni Video Ekle
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
              Video URL (.mp4)
            </label>
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                Başlık (opsiyonel)
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Konser videosu"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                Gösterim Süresi (saniye)
              </label>
              <input
                type="number"
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
                min={3}
                max={120}
                className={inputCls}
              />
            </div>
          </div>
          <button
            onClick={addVideo}
            disabled={adding || !newUrl.trim()}
            className="px-3 py-1.5 bg-white text-zinc-950 text-xs font-semibold rounded-md hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {adding ? 'Ekleniyor...' : '+ Video Ekle'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-md p-3 mb-5 text-[11px] text-blue-300">
        Videolar sırayla oynar. Her videonun gösterim süresi dolunca bir sonrakine geçer.
        Sıralamayı ↑↓ okları ile değiştirebilirsiniz.
      </div>

      {/* Video list */}
      {videosLoading ? (
        <TableSkeleton rows={3} showHeader={false} />
      ) : videos.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/40 rounded-lg border border-zinc-800">
          <p className="text-sm text-zinc-100 font-medium">Henüz video eklenmedi</p>
          <p className="text-xs text-zinc-500 mt-1">Yukarıdan .mp4 URL&apos;si ekleyin</p>
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((v, idx) => (
            <div
              key={v.id}
              className={`bg-zinc-900/40 rounded-lg border border-zinc-800 p-3 flex items-center gap-3 transition-opacity ${
                v.isActive ? '' : 'opacity-50'
              }`}
            >
              {/* Order */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={() => moveVideo(v, -1)}
                  disabled={idx === 0}
                  className="text-zinc-500 hover:text-zinc-100 disabled:opacity-20 text-xs transition-colors"
                  aria-label="Yukarı taşı"
                >
                  ↑
                </button>
                <span className="text-[10px] text-zinc-500 text-center font-mono">{idx + 1}</span>
                <button
                  onClick={() => moveVideo(v, 1)}
                  disabled={idx === videos.length - 1}
                  className="text-zinc-500 hover:text-zinc-100 disabled:opacity-20 text-xs transition-colors"
                  aria-label="Aşağı taşı"
                >
                  ↓
                </button>
              </div>

              {/* Preview */}
              <div className="w-28 h-16 rounded-md overflow-hidden bg-zinc-950 ring-1 ring-zinc-800 flex-shrink-0">
                <video src={v.url} muted className="w-full h-full object-cover" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-100 truncate">{v.title || v.url}</p>
                <p className="text-[10px] text-zinc-500 truncate font-mono mt-0.5">{v.url}</p>
              </div>

              {/* Duration */}
              <div className="flex-shrink-0">
                <label className="block text-[9px] text-zinc-500 mb-0.5">Süre (sn)</label>
                <input
                  type="number"
                  value={v.duration}
                  min={3}
                  max={120}
                  onChange={(e) => updateDuration(v, Number(e.target.value))}
                  className="w-16 px-2 py-1 text-xs bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-md text-center outline-none hover:border-zinc-700 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleActive(v)}
                  className={`px-2 py-1 text-[10px] font-medium rounded-md border transition-colors ${
                    v.isActive
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/15'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  {v.isActive ? 'Aktif' : 'Pasif'}
                </button>
                <button
                  onClick={() => deleteVideo(v.id)}
                  className="px-2 py-1 text-[10px] font-medium rounded-md bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/15 transition-colors"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
