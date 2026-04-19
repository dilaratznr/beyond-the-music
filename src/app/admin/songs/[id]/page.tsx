'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/admin/Toast';
import DeleteButton from '@/components/admin/DeleteButton';
import { FormSkeleton } from '@/components/admin/Loading';
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

export default function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: '',
    albumId: '',
    trackNumber: '' as number | string,
    duration: '',
    isDeepCut: false,
    spotifyUrl: '',
    youtubeUrl: '',
  });
  const [albums, setAlbums] = useState<AlbumOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/songs/${id}`).then((r) => r.json()),
      fetch('/api/albums?page=1&limit=500').then((r) => r.json()),
    ])
      .then(([song, albumsList]) => {
        if (cancelled) return;
        if (song?.error) {
          setError(song.error);
        } else {
          setForm({
            title: song.title || '',
            albumId: song.albumId || '',
            trackNumber: song.trackNumber ?? '',
            duration: song.duration || '',
            isDeepCut: Boolean(song.isDeepCut),
            spotifyUrl: song.spotifyUrl || '',
            youtubeUrl: song.youtubeUrl || '',
          });
        }
        const list = Array.isArray(albumsList) ? albumsList : albumsList.items || [];
        setAlbums(list);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const update = useCallback(<K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const res = await fetch(`/api/songs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        trackNumber: form.trackNumber === '' ? null : Number(form.trackNumber),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || 'Güncellenemedi');
      toast(data.error || 'Güncellenemedi', 'error');
      return;
    }
    toast('Şarkı güncellendi');
    router.push('/admin/songs');
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <div className="mb-5">
          <div className="h-5 w-40 bg-zinc-800/60 rounded-md animate-pulse mb-2" />
          <div className="h-3 w-64 bg-zinc-800/60 rounded animate-pulse" />
        </div>
        <FormSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Şarkı Düzenle</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">{form.title || 'Şarkı'} bilgilerini güncelle</p>
        </div>
        <Link
          href="/admin/songs"
          className="text-[12px] text-zinc-500 hover:text-zinc-100 transition-colors"
        >
          ← Tüm Şarkılar
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
            </label>
          </FormSection>

          <FormSection title="Bağlantılar" description="Dinleme bağlantıları opsiyonel.">
            <div>
              <FieldLabel htmlFor="song-spotify">Spotify</FieldLabel>
              <TextInput
                id="song-spotify"
                type="url"
                value={form.spotifyUrl}
                onChange={(v) => update('spotifyUrl', v)}
                placeholder="https://open.spotify.com/track/…"
              />
            </div>
            <div>
              <FieldLabel htmlFor="song-youtube">YouTube</FieldLabel>
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
          cancelHref="/admin/songs"
          submitLabel="Kaydet"
          submittingLabel="Kaydediliyor…"
          submitting={saving}
          disabled={!form.title || !form.albumId}
          extra={
            <DeleteButton
              variant="outline"
              endpoint={`/api/songs/${id}`}
              confirmMessage={`"${form.title}" şarkısını silmek istediğinizden emin misiniz?`}
              onDeleted={() => router.push('/admin/songs')}
            />
          }
        />
      </form>
    </div>
  );
}
