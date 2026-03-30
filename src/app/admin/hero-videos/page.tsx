'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/admin/Toast';

interface HeroVideo { id: string; url: string; duration: number; order: number; isActive: boolean; title: string | null; }

export default function HeroVideosPage() {
  const [videos, setVideos] = useState<HeroVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [newDuration, setNewDuration] = useState(10);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  async function loadVideos() {
    const res = await fetch('/api/hero-videos');
    const data = await res.json();
    if (Array.isArray(data)) setVideos(data);
    setLoading(false);
  }

  useEffect(() => { loadVideos(); }, []);

  async function addVideo() {
    if (!newUrl.trim()) return;
    setAdding(true);
    await fetch('/api/hero-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newUrl, duration: newDuration, title: newTitle || null }),
    });
    setNewUrl(''); setNewDuration(10); setNewTitle('');
    setAdding(false);
    toast('Video eklendi');
    loadVideos();
  }

  async function toggleActive(v: HeroVideo) {
    await fetch('/api/hero-videos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: v.id, isActive: !v.isActive }) });
    toast(v.isActive ? 'Video pasife alındı' : 'Video aktif edildi');
    loadVideos();
  }

  async function updateDuration(v: HeroVideo, dur: number) {
    await fetch('/api/hero-videos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: v.id, duration: dur }) });
    toast('Süre güncellendi');
    loadVideos();
  }

  async function moveVideo(v: HeroVideo, dir: -1 | 1) {
    const idx = videos.findIndex((x) => x.id === v.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= videos.length) return;
    const swap = videos[swapIdx];
    await Promise.all([
      fetch('/api/hero-videos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: v.id, order: swap.order }) }),
      fetch('/api/hero-videos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: swap.id, order: v.order }) }),
    ]);
    toast('Sıralama güncellendi');
    loadVideos();
  }

  async function deleteVideo(id: string) {
    if (!confirm('Bu videoyu silmek istediğinize emin misiniz?')) return;
    await fetch(`/api/hero-videos?id=${id}`, { method: 'DELETE' });
    toast('Video silindi');
    loadVideos();
  }

  const activeCount = videos.filter((v) => v.isActive).length;
  const totalDuration = videos.filter((v) => v.isActive).reduce((sum, v) => sum + v.duration, 0);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Hero Videoları</h1>
          <p className="text-xs text-zinc-500">Ana sayfada arka arkaya oynayacak videolar · {activeCount} aktif · toplam {totalDuration}sn</p>
        </div>
      </div>

      {/* Add new video */}
      <div className="bg-white rounded-xl border border-zinc-100 p-4 mb-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-3">Yeni Video Ekle</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium text-zinc-500 mb-1">Video URL (.mp4)</label>
            <input type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none bg-zinc-50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-zinc-500 mb-1">Başlık (opsiyonel)</label>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Konser videosu"
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none bg-zinc-50" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-zinc-500 mb-1">Gösterim Süresi (saniye)</label>
              <input type="number" value={newDuration} onChange={(e) => setNewDuration(Number(e.target.value))}
                min={3} max={120}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none bg-zinc-50" />
            </div>
          </div>
          <button onClick={addVideo} disabled={adding || !newUrl.trim()}
            className="px-4 py-2 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-40">
            {adding ? 'Ekleniyor...' : '+ Video Ekle'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-5 text-[11px] text-blue-700">
        Videolar sırayla oynar. Her videonun gösterim süresi dolunca bir sonrakine geçer. Sıralamayı ↑↓ okları ile değiştirebilirsiniz.
      </div>

      {/* Video list */}
      {loading ? <p className="text-zinc-400 text-xs">Yükleniyor...</p> : videos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-zinc-100">
          <p className="text-xs text-zinc-400">Henüz video eklenmedi</p>
          <p className="text-[10px] text-zinc-400 mt-1">Yukarıdan .mp4 URL'si ekleyin</p>
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((v, idx) => (
            <div key={v.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${v.isActive ? 'border-zinc-100' : 'border-zinc-100 opacity-50'}`}>
              {/* Order */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button onClick={() => moveVideo(v, -1)} disabled={idx === 0}
                  className="text-zinc-400 hover:text-zinc-700 disabled:opacity-20 text-xs">↑</button>
                <span className="text-[10px] text-zinc-400 text-center">{idx + 1}</span>
                <button onClick={() => moveVideo(v, 1)} disabled={idx === videos.length - 1}
                  className="text-zinc-400 hover:text-zinc-700 disabled:opacity-20 text-xs">↓</button>
              </div>

              {/* Preview */}
              <div className="w-28 h-16 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0">
                <video src={v.url} muted className="w-full h-full object-cover" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-900 truncate">{v.title || v.url}</p>
                <p className="text-[10px] text-zinc-400 truncate font-mono mt-0.5">{v.url}</p>
              </div>

              {/* Duration */}
              <div className="flex-shrink-0">
                <label className="block text-[9px] text-zinc-400 mb-0.5">Süre (sn)</label>
                <input type="number" value={v.duration} min={3} max={120}
                  onChange={(e) => updateDuration(v, Number(e.target.value))}
                  className="w-16 px-2 py-1 text-xs border border-zinc-200 rounded-md text-center" />
              </div>

              {/* Actions */}
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => toggleActive(v)}
                  className={`px-2 py-1 text-[10px] font-medium rounded-md ${v.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
                  {v.isActive ? 'Aktif' : 'Pasif'}
                </button>
                <button onClick={() => deleteVideo(v.id)}
                  className="px-2 py-1 text-[10px] font-medium rounded-md bg-red-50 text-red-500 hover:bg-red-100">
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
