'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/admin/Toast';
import DeleteButton from '@/components/admin/DeleteButton';
import ImageUploader from '@/components/admin/ImageUploader';
import { FormSkeleton } from '@/components/admin/Loading';
import {
  FieldLabel,
  TextInput,
  TextArea,
  Select,
  FormSection,
  FormActions,
  FormError,
} from '@/components/admin/FormField';
import { translatePairs } from '@/lib/translate-client';
import AlbumSongs from '@/components/admin/AlbumSongs';

interface ArtistOption {
  id: string;
  name: string;
}

export default function EditAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: '',
    artistId: '',
    releaseDate: '',
    coverImage: '',
    descriptionTr: '',
    descriptionEn: '',
  });
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState('');
  const [songsReloadToken, setSongsReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/albums/${id}`).then((r) => r.json()),
      fetch('/api/artists?all=true').then((r) => r.json()),
    ])
      .then(([album, artistsList]) => {
        if (cancelled) return;
        if (album?.error) {
          setError(album.error);
        } else {
          setForm({
            title: album.title || '',
            artistId: album.artistId || '',
            releaseDate: album.releaseDate ? String(album.releaseDate).slice(0, 10) : '',
            coverImage: album.coverImage || '',
            descriptionTr: album.descriptionTr || '',
            descriptionEn: album.descriptionEn || '',
          });
        }
        setArtists(Array.isArray(artistsList) ? artistsList : []);
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

    setTranslating(true);
    const translations = await translatePairs([
      {
        key: 'descriptionEn',
        sourceText: form.descriptionTr,
        targetText: form.descriptionEn,
      },
    ]);
    setTranslating(false);

    const res = await fetch(`/api/albums/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        ...translations,
        releaseDate: form.releaseDate || null,
        coverImage: form.coverImage || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || 'Güncellenemedi');
      toast(data.error || 'Güncellenemedi', 'error');
      return;
    }
    toast('Albüm güncellendi');
    router.push('/admin/albums');
  }

  if (loading) {
    return (
      <div className="max-w-5xl">
        <div className="mb-5">
          <div className="h-5 w-40 bg-zinc-800/60 rounded-md animate-pulse mb-2" />
          <div className="h-3 w-64 bg-zinc-800/60 rounded animate-pulse" />
        </div>
        <FormSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Albüm Düzenle</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">{form.title || 'Albüm'} bilgilerini güncelle</p>
        </div>
        <Link
          href="/admin/albums"
          className="text-[12px] text-zinc-500 hover:text-zinc-100 transition-colors"
        >
          ← Tüm Albümler
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError>{error}</FormError>}

        <div className="grid lg:grid-cols-[1fr_260px] gap-5">
          {/* Left: main fields */}
          <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 p-5 space-y-5">
            <FormSection title="Temel Bilgiler">
              <div>
                <FieldLabel htmlFor="album-title" required>
                  Başlık
                </FieldLabel>
                <TextInput
                  id="album-title"
                  value={form.title}
                  onChange={(v) => update('title', v)}
                  placeholder="örn. Amnesiac"
                  required
                />
              </div>

              <div className="grid grid-cols-[1fr_180px] gap-4">
                <div>
                  <FieldLabel htmlFor="album-artist" required>
                    Sanatçı
                  </FieldLabel>
                  <Select
                    id="album-artist"
                    value={form.artistId}
                    onChange={(v) => update('artistId', v)}
                  >
                    <option value="">Seçiniz…</option>
                    {artists.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="album-date">Yayın Tarihi</FieldLabel>
                  <input
                    id="album-date"
                    type="date"
                    value={form.releaseDate}
                    onChange={(e) => update('releaseDate', e.target.value)}
                    className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none transition-colors focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Açıklama" description="Albüm için kısa tanıtım metinleri.">
              <div>
                <FieldLabel htmlFor="album-desc-tr" hint="Türkçe">
                  Açıklama (TR)
                </FieldLabel>
                <TextArea
                  id="album-desc-tr"
                  value={form.descriptionTr}
                  onChange={(v) => update('descriptionTr', v)}
                  placeholder="Albümün hikayesi, öne çıkan parçalar, üretim süreci..."
                  rows={4}
                />
              </div>
              <div>
                <FieldLabel htmlFor="album-desc-en" hint="English">
                  Açıklama (EN)
                </FieldLabel>
                <TextArea
                  id="album-desc-en"
                  value={form.descriptionEn}
                  onChange={(v) => update('descriptionEn', v)}
                  placeholder="Short English description..."
                  rows={4}
                />
              </div>
            </FormSection>
          </div>

          {/* Right: cover image */}
          <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 p-5 h-fit lg:sticky lg:top-5">
            <ImageUploader
              value={form.coverImage}
              onChange={(url) => update('coverImage', url)}
              category="album"
              label="Albüm Kapağı"
              aspect="square"
              helperText="Kare oranlı · JPG · PNG · WebP · en fazla 5MB"
            />
          </div>
        </div>

        <FormActions
          cancelHref="/admin/albums"
          submitLabel="Kaydet"
          submittingLabel={translating ? 'Çevriliyor…' : 'Kaydediliyor…'}
          submitting={saving}
          disabled={!form.title || !form.artistId}
          extra={
            <DeleteButton
              variant="outline"
              endpoint={`/api/albums/${id}`}
              confirmMessage={`"${form.title}" albümünü silmek istediğinizden emin misiniz?`}
              onDeleted={() => router.push('/admin/albums')}
            />
          }
        />
      </form>

      <div className="mt-6 bg-zinc-900/40 rounded-lg border border-zinc-800 p-5">
        <AlbumSongs
          albumId={id}
          reloadToken={songsReloadToken}
          onChanged={() => setSongsReloadToken((t) => t + 1)}
        />
      </div>
    </div>
  );
}
