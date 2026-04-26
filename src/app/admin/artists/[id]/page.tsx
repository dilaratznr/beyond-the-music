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
import { useCanPublish } from '@/components/admin/useCanPublish';
import ReviewNotice from '@/components/admin/ReviewNotice';

interface GenreOption {
  id: string;
  nameTr: string;
  parentId: string | null;
}

const TYPES = [
  { v: 'SOLO', l: 'Solo' },
  { v: 'GROUP', l: 'Grup / Band' },
  { v: 'COMPOSER', l: 'Besteci' },
];

export default function EditArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    type: 'SOLO',
    bioTr: '',
    bioEn: '',
    image: '',
    genreIds: [] as string[],
  });
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState('');
  const [lastRejection, setLastRejection] = useState<{
    reviewNote: string | null;
    reviewedAt: string | null;
    reviewedBy: { name: string } | null;
  } | null>(null);
  const canPublish = useCanPublish('ARTIST');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/artists/${id}`).then((r) => r.json()),
      fetch('/api/genres?all=true').then((r) => r.json()),
    ])
      .then(([artist, genresList]) => {
        if (cancelled) return;
        if (artist?.error) {
          setError(artist.error);
        } else {
          setForm({
            name: artist.name || '',
            type: artist.type || 'SOLO',
            bioTr: artist.bioTr || '',
            bioEn: artist.bioEn || '',
            image: artist.image || '',
            genreIds: Array.isArray(artist.genres)
              ? artist.genres.map((g: { genreId: string }) => g.genreId)
              : [],
          });
          if (artist.lastRejection) setLastRejection(artist.lastRejection);
        }
        setGenres(Array.isArray(genresList) ? genresList : []);
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

  function toggleGenre(gId: string) {
    setForm((prev) => ({
      ...prev,
      genreIds: prev.genreIds.includes(gId)
        ? prev.genreIds.filter((g) => g !== gId)
        : [...prev.genreIds, gId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError('');

    setTranslating(true);
    const translations = await translatePairs([
      { key: 'bioEn', sourceText: form.bioTr, targetText: form.bioEn },
    ]);
    setTranslating(false);

    const res = await fetch(`/api/artists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        ...translations,
        image: form.image || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || 'Güncellenemedi');
      toast(data.error || 'Güncellenemedi', 'error');
      return;
    }
    toast('Sanatçı güncellendi');
    router.push('/admin/artists');
  }

  if (loading) {
    return (
      <div className="max-w-5xl">
        <div className="mb-5">
          <div className="h-5 w-44 bg-zinc-800/60 rounded-md animate-pulse mb-2" />
          <div className="h-3 w-64 bg-zinc-800/60 rounded animate-pulse" />
        </div>
        <FormSkeleton />
      </div>
    );
  }

  const topLevelGenres = genres.filter((g) => !g.parentId);

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Sanatçı Düzenle</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">{form.name || 'Sanatçı'} bilgilerini güncelle</p>
        </div>
        <Link
          href="/admin/artists"
          className="text-[12px] text-zinc-500 hover:text-zinc-100 transition-colors"
        >
          ← Tüm Sanatçılar
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError>{error}</FormError>}

        <ReviewNotice section="ARTIST" canPublish={canPublish} lastRejection={lastRejection} />

        <div className="grid lg:grid-cols-[1fr_260px] gap-5">
          {/* Left: main fields */}
          <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 p-5 space-y-5">
            <FormSection title="Temel Bilgiler">
              <div className="grid grid-cols-[1fr_200px] gap-4">
                <div>
                  <FieldLabel htmlFor="art-name" required>
                    İsim
                  </FieldLabel>
                  <TextInput
                    id="art-name"
                    value={form.name}
                    onChange={(v) => update('name', v)}
                    placeholder="örn. David Bowie"
                    required
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="art-type">Tip</FieldLabel>
                  <Select
                    id="art-type"
                    value={form.type}
                    onChange={(v) => update('type', v)}
                  >
                    {TYPES.map((t) => (
                      <option key={t.v} value={t.v}>
                        {t.l}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

            </FormSection>

            {topLevelGenres.length > 0 && (
              <FormSection title="Türler" description="Sanatçıyı tanımlayan ana türleri seç.">
                <div className="flex flex-wrap gap-1.5">
                  {topLevelGenres.map((g) => {
                    const selected = form.genreIds.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGenre(g.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                          selected
                            ? 'bg-white text-zinc-950'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {g.nameTr}
                      </button>
                    );
                  })}
                </div>
              </FormSection>
            )}

            <FormSection title="Biyografi" description="Kısa tanıtım metinleri. TR ve EN doldurmanız önerilir.">
              <div>
                <FieldLabel htmlFor="art-bio-tr" hint="Türkçe">
                  Biyografi (TR)
                </FieldLabel>
                <TextArea
                  id="art-bio-tr"
                  value={form.bioTr}
                  onChange={(v) => update('bioTr', v)}
                  placeholder="Sanatçının hikayesi, etkileri, öne çıkan işleri..."
                  rows={4}
                />
              </div>
              <div>
                <FieldLabel htmlFor="art-bio-en" hint="English">
                  Biyografi (EN)
                </FieldLabel>
                <TextArea
                  id="art-bio-en"
                  value={form.bioEn}
                  onChange={(v) => update('bioEn', v)}
                  placeholder="Short English biography..."
                  rows={4}
                />
              </div>
            </FormSection>
          </div>

          {/* Right: image */}
          <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 p-5 h-fit lg:sticky lg:top-5">
            <ImageUploader
              value={form.image}
              onChange={(url) => update('image', url)}
              category="artist"
              label="Sanatçı Görseli"
              aspect="portrait"
              helperText="Portre oranlı · JPG · PNG · WebP · en fazla 5MB"
            />
          </div>
        </div>

        <FormActions
          cancelHref="/admin/artists"
          submitLabel={canPublish === false ? 'Onaya Gönder' : 'Kaydet'}
          submittingLabel={translating ? 'Çevriliyor…' : canPublish === false ? 'Gönderiliyor…' : 'Kaydediliyor…'}
          submitting={saving}
          disabled={!form.name}
          extra={
            <DeleteButton
              variant="outline"
              endpoint={`/api/artists/${id}`}
              confirmMessage={`"${form.name}" sanatçısını silmek istediğinizden emin misiniz? Albümleri ve şarkıları da silinecek.`}
              onDeleted={() => router.push('/admin/artists')}
            />
          }
        />
      </form>
    </div>
  );
}
