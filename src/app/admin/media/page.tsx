'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/admin/Toast';

interface MediaFile { id: string; url: string; entityType: string; createdAt: string; }

const CATEGORIES = [
  { value: 'artist', label: 'Sanatçı Görseli', color: 'bg-violet-50 text-violet-600' },
  { value: 'genre', label: 'Tür Görseli', color: 'bg-blue-50 text-blue-600' },
  { value: 'album', label: 'Albüm Kapağı', color: 'bg-emerald-50 text-emerald-600' },
  { value: 'article', label: 'Makale Görseli', color: 'bg-amber-50 text-amber-600' },
  { value: 'architect', label: 'Mimar Görseli', color: 'bg-red-50 text-red-600' },
  { value: 'listening-path', label: 'Rota Görseli', color: 'bg-teal-50 text-teal-600' },
  { value: 'hero', label: 'Ana Sayfa', color: 'bg-pink-50 text-pink-600' },
  { value: 'other', label: 'Diğer', color: 'bg-zinc-100 text-zinc-500' },
];

export default function MediaPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('article');
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/upload').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setFiles(d); setLoading(false); });
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList) return;
    setUploading(true);

    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', selectedCategory);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        toast('Görsel yüklendi');
        const all = await fetch('/api/upload').then((r) => r.json());
        if (Array.isArray(all)) setFiles(all);
      } else { toast('Yükleme hatası', 'error'); }
    }
    setUploading(false);
    e.target.value = '';
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(url);
    toast('URL kopyalandı');
    setTimeout(() => setCopied(null), 2000);
  }

  const getCatInfo = (type: string) => CATEGORIES.find((c) => c.value === type) || CATEGORIES[CATEGORIES.length - 1];
  const filtered = filter === 'all' ? files : files.filter((f) => f.entityType === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Medya Kütüphanesi</h1>
          <p className="text-xs text-zinc-500">{files.length} görsel yüklendi</p>
        </div>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-xl border border-zinc-100 p-4 mb-5">
        <div className="flex items-end gap-3">
          <div className="flex-shrink-0">
            <label className="block text-[10px] font-medium text-zinc-500 mb-1">Kategori</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none bg-zinc-50 w-44">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-zinc-200 rounded-lg cursor-pointer hover:border-zinc-400 transition-colors">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>
            <span className="text-xs text-zinc-500">{uploading ? 'Yükleniyor...' : 'Görsel Yükle'}</span>
            <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-5 text-[11px] text-blue-700">
        <strong>Kullanım:</strong> Kategori seç → Görsel yükle → URL Kopyala butonuna tıkla → İlgili formun görsel URL alanına yapıştır
      </div>

      {/* Filter */}
      {files.length > 0 && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          <button onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium ${filter === 'all' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-500 border border-zinc-200'}`}>
            Tümü ({files.length})
          </button>
          {CATEGORIES.map((c) => {
            const count = files.filter((f) => f.entityType === c.value).length;
            if (count === 0) return null;
            return (
              <button key={c.value} onClick={() => setFilter(c.value)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium ${filter === c.value ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-500 border border-zinc-200'}`}>
                {c.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Gallery */}
      {loading ? <p className="text-zinc-400 text-xs">Yükleniyor...</p> : filtered.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((file) => {
            const cat = getCatInfo(file.entityType);
            return (
              <div key={file.id} className="bg-white rounded-xl border border-zinc-100 overflow-hidden group">
                <div className="relative aspect-square overflow-hidden">
                  <img src={file.url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                    <button onClick={() => copyUrl(file.url)}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-white text-zinc-900 text-[10px] font-bold rounded-lg transition-opacity">
                      {copied === file.url ? '✓ Kopyalandı' : 'URL Kopyala'}
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${cat.color}`}>{cat.label}</span>
                  <p className="text-[9px] text-zinc-400 mt-1 truncate font-mono">{file.url}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-zinc-100">
          <p className="text-xs text-zinc-400">Henüz görsel yüklenmedi</p>
        </div>
      )}
    </div>
  );
}
