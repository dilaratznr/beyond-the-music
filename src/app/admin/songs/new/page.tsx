'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/admin/Toast';
import {
  FieldLabel,
  TextInput,
  Select,
  FormSection,
  FormActions,
  FormError,
} from '@/components/admin/FormField';

interface AlbumOption {
  id: string;
  title: string;
  artist?: { name: string };
}

function NewSongForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillAlbumId = searchParams.get('albumId') || '';
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: '',
    albumId: prefillAlbumId,
    trackNumber: '',
    duration: '',
    isDeepCut: false,
    spotifyUrl: '',
    youtubeUrl: '',
  });
  const [albums, setAlbums] = useState<AlbumOption[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/albums?page=1&limit=500')
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : d.items || [];
        setAlbums(list);
      });
  }, []);

  const update = useCallback(<K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        trackNumber: form.trackNumber ? Number(form.trackNumber) : null,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || 'Kaydedilemedi');
      toast(data.error || 'Kaydedilemedi', 'error');
      return;
    }
    toast('Şarkı eklendi');
    if (prefillAlbumId) {
      router.push(`/admin/albums/${prefillAlbumId}`);
    } else {
      router.push('/admin/songs');
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Yeni Şarkı</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Şarkı eklemek için albümün önceden tanımlı olması gerekir.
          </p>
        </div>
        <Link
          href={prefillAlbumId ? `/admin/albums/${prefillAlbumId}` : '/admin/songs'}
          className="text-[12px] text-zinc-500 hover:text-zinc-100 transition-colors"
        >
          ← Geri
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError>{error}</FormError>}

        <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 p-5 space-y-5">
          <FormSection title="Temel Bilgiler">
            <div>
              <FieldLabel htmlFor="song-title" required>
                Başlık
              </FieldLabel>
              <TextInput
                id="song-title"
                value={form.title}
                onChange={(v) => update('title', v)}
                placeholder="örn. Pyramid Song"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-[1fr_110px_110px] gap-4">
              <div>
                <FieldLabel htmlFor="song-album" required>
                  Albüm
                </FieldLabel>
                <Select id="song-album" value={form.albumId} onChange={(v) => update('albumId', v)}>
                  <option value="">Seçiniz…</option>
                  {albums.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                      {a.artist?.name ? ` · ${a.artist.name}` : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="song-track">Sıra</FieldLabel>
                <TextInput
                  id="song-track"
                  type="number"
                  value={form.trackNumber}
                  onChange={(v) => update('trackNumber', v)}
                  min={1}
                />
              </div>
              <div>
                <FieldLabel htmlFor="song-duration" hint="örn. 4:32">
                  Süre
                </FieldLabel>
                <TextInput
                  id="song-duration"
                  value={form.duration}
                  onChange={(v) => update('duration', v)}
                  placeholder="4:32"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-zinc-700 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDeepCut}
                onChange={(e) => update('isDeepCut', e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 accent-fuchsia-600"
              />
              <span className="font-medium">Deep Cut olarak işaretle</span>
              <span className="text-zinc-400 text-[11px]">
                (Az bilinen / öne çıkarılan parçalar)
              </span>
            </label>
          </FormSection>

          <FormSection title="Bağlantılar" description="Dinleme bağlantıları opsiyonel.">
            <div>
              <FieldLabel htmlFor="song-spotify" hint="https://open.spotify.com/track/…">
                Spotify
              </FieldLabel>
              <TextInput
                id="song-spotify"
                type="url"
                value={form.spotifyUrl}
                onChange={(v) => update('spotifyUrl', v)}
                placeholder="https://open.spotify.com/track/…"
              />
            </div>
            <div>
              <FieldLabel htmlFor="song-youtube" hint="https://youtube.com/watch?v=…">
                YouTube
              </FieldLabel>
              <TextInput
                id="song-youtube"
                type="url"
                value={form.youtubeUrl}
                onChange={(v) => update('youtubeUrl', v)}
                placeholder="https://youtube.com/watch?v=…"
              />
            </div>
          </FormSection>
        </div>

        <FormActions
          cancelHref={prefillAlbumId ? `/admin/albums/${prefillAlbumId}` : '/admin/songs'}
          submitLabel="Şarkı Ekle"
          submittingLabel="Ekleniyor…"
          submitting={submitting}
          disabled={!form.title || !form.albumId}
        />
      </form>
    </div>
  );
}

export default function NewSongPage() {
  return (
    <Suspense fallback={null}>
      <NewSongForm />
    </Suspense>
  );
}
