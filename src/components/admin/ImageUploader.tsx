'use client';

import { useRef, useState } from 'react';
import { useToast } from '@/components/admin/Toast';

/**
 * Reusable image uploader for admin entity forms.
 *
 * Behavior:
 *  - Shows a preview when `value` is set; otherwise a dashed drop zone.
 *  - Click-to-pick or drag-and-drop; also accepts paste of a URL as a fallback.
 *  - Uploads to /api/upload with the given `category`, then calls onChange(url).
 *  - "Kaldır" clears the value.
 *  - "URL yapıştır" lets you paste an external URL instead of uploading.
 */
export default function ImageUploader({
  value,
  onChange,
  category,
  label = 'Görsel',
  aspect = 'square',
  helperText,
}: {
  value: string;
  onChange: (url: string) => void;
  category:
    | 'artist'
    | 'album'
    | 'genre'
    | 'article'
    | 'architect'
    | 'listening-path'
    | 'hero'
    | 'other';
  label?: string;
  aspect?: 'square' | 'wide' | 'portrait';
  helperText?: string;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const aspectClass =
    aspect === 'wide'
      ? 'aspect-[16/9]'
      : aspect === 'portrait'
        ? 'aspect-[3/4]'
        : 'aspect-square';

  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast('Sadece görsel dosyası yüklenebilir', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Görsel 5MB’tan küçük olmalı', 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        onChange(data.url);
        toast('Görsel yüklendi');
      } else {
        toast(data.error || 'Yükleme hatası', 'error');
      }
    } catch {
      toast('Yükleme hatası', 'error');
    } finally {
      setUploading(false);
    }
  }

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function commitUrl() {
    const trimmed = urlDraft.trim();
    if (!trimmed) {
      setUrlMode(false);
      return;
    }
    onChange(trimmed);
    setUrlDraft('');
    setUrlMode(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-[12px] font-medium text-zinc-300">{label}</label>
        <div className="flex items-center gap-3 text-[11px]">
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              Kaldır
            </button>
          )}
          <button
            type="button"
            onClick={() => setUrlMode((v) => !v)}
            className="text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            {urlMode ? 'İptal' : 'URL yapıştır'}
          </button>
        </div>
      </div>

      {urlMode ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitUrl();
              }
            }}
            placeholder="https://..."
            autoFocus
            className="flex-1 px-3 py-2 text-sm text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-md hover:border-zinc-700 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 outline-none placeholder:text-zinc-600"
          />
          <button
            type="button"
            onClick={commitUrl}
            className="px-3 py-2 bg-white text-zinc-950 rounded-md text-xs font-semibold hover:bg-zinc-200 transition-colors"
          >
            Kullan
          </button>
        </div>
      ) : value ? (
        <div
          className={`relative ${aspectClass} w-full max-w-[220px] rounded-md overflow-hidden border border-zinc-800 bg-zinc-900 group`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/60 transition-colors"
          >
            <span className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-white text-zinc-900 text-[11px] font-semibold rounded-md transition-opacity">
              {uploading ? 'Yükleniyor…' : 'Değiştir'}
            </span>
          </button>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`${aspectClass} w-full max-w-[220px] flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
            dragOver
              ? 'border-zinc-500 bg-zinc-900/80'
              : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40'
          } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <svg
            className="w-7 h-7 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
            />
          </svg>
          <span className="text-xs font-medium text-zinc-300">
            {uploading ? 'Yükleniyor…' : 'Görsel yükle'}
          </span>
          <span className="text-[10px] text-zinc-500">Sürükle bırak veya tıkla</span>
        </label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handlePick}
        className="hidden"
      />

      <p className="text-[11px] text-zinc-500 mt-1.5">
        {helperText || 'JPG · PNG · WebP · GIF — en fazla 5MB.'}
      </p>
    </div>
  );
}
