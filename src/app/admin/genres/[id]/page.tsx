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

export default function EditGenrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    nameTr: '',
    nameEn: '',
    descriptionTr: '',
    descriptionEn: '',
    image: '',
    parentId: '',
    order: 0,
  });
  const [parents, setParents] = useState<GenreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState('');
  const [lastRejection, setLastRejection] = useState<{
    reviewNote: string | null;
    reviewedAt: string | null;
    reviewedBy: { name: string } | null;
  } | null>(null);
  const canPublish = useCanPublish('GENRE');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/genres/${id}`).then((r) => r.json()),
      fetch('/api/genres?all=true').then((r) => r.json()),
    ])
      .then(([genre, genresList]) => {
        if (cancelled) return;
        if (genre?.error) {
          setError(genre.error);
        } else {
          setForm({
            nameTr: genre.nameTr || '',
            nameEn: genre.nameEn || '',
            descriptionTr: genre.descriptionTr || '',
            descriptionEn: genre.descriptionEn || '',
            image: genre.image || '',
            parentId: genre.parentId || '',
            order: genre.order ?? 0,
          });
          if (genre.lastRejection) setLastRejection(genre.lastRejection);
        }
        setParents(
          Array.isArray(genresList)
            ? (genresList as GenreOption[]).filter((g) => !g.parentId && g.id !== id)
            : []
        );
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
      { key: 'nameEn', sourceText: form.nameTr, targetText: form.nameEn },
      {
        key: 'descriptionEn',
        sourceText: form.descriptionTr,
        targetText: form.descriptionEn,
      },
    ]);
    setTranslating(false);

    const res = await fetch(`/api/genres/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        ...translations,
        image: form.image || null,
        parentId: form.parentId || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || 'Güncellenemedi');
      toast(data.error || 'Güncellenemedi', 'error');
      return;
    }
    toast('Tür güncellendi');
    router.push('/admin/genres');
  }

  if (loading) {
    return (
      <div className="max-w-5xl">
        <div className="mb-5">
          <div className="h-5 w-40 bg-zinc-800/60 rounded-md animate-pulse mb-2" />
          <div className="h-3 w-56 bg-zinc-800/60 rounded animate-pulse" />
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
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Tür Düzenle</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            {form.nameTr || 'Tür'} bilgilerini güncelle
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/genres"
            className="text-[12px] text-zinc-500 hover:text-zinc-100 transition-colors"
          >
            ← Tüm Türler
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError>{error}</FormError>}

        <ReviewNotice section="GENRE" canPublish={canPublish} lastRejection={lastRejection} />

        <div className="grid lg:grid-cols-[1fr_260px] gap-5">
          {/* Left: main fields */}
          <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 p-5 space-y-5">
            <FormSection title="Temel Bilgiler">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel htmlFor="g-name-tr" required>
                    İsim (TR)
                  </FieldLabel>
                  <TextInput
                    id="g-name-tr"
                    value={form.nameTr}
                    onChange={(v) => update('nameTr', v)}
                    placeholder="örn. Caz"
                    required
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="g-name-en" hint="Boş bırakırsanız otomatik çevrilir">
                    İsim (EN)
                  </FieldLabel>
                  <TextInput
                    id="g-name-en"
                    value={form.nameEn}
                    onChange={(v) => update('nameEn', v)}
                    placeholder="e.g. Jazz"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[1fr_110px] gap-4">
                <div>
                  <FieldLabel htmlFor="g-parent" hint="Alt tür eklerken ana türü seç">
                    Üst Tür
                  </FieldLabel>
                  <Select
                    id="g-parent"
                    value={form.parentId}
                    onChange={(v) => update('parentId', v)}
                  >
                    <option value="">Yok (Ana Tür)</option>
                    {parents.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nameTr}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="g-order" hint="Küçük → önce">
                    Sıra
                  </FieldLabel>
                  <TextInput
                    id="g-order"
                    type="number"
                    value={form.order}
                    onChange={(v) => update('order', Number(v) || 0)}
                    min={0}
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Açıklama" description="Tür için kısa tanıtım metinleri">
              <div>
                <FieldLabel htmlFor="g-desc-tr">Açıklama (TR)</FieldLabel>
                <TextArea
                  id="g-desc-tr"
                  value={form.descriptionTr}
                  onChange={(v) => update('descriptionTr', v)}
                  placeholder="Bu tür ne anlatır, hangi yönleriyle öne çıkar..."
                  rows={3}
                />
              </div>
              <div>
                <FieldLabel htmlFor="g-desc-en">Açıklama (EN)</FieldLabel>
                <TextArea
                  id="g-desc-en"
                  value={form.descriptionEn}
                  onChange={(v) => update('descriptionEn', v)}
                  placeholder="Short English description..."
                  rows={3}
                />
              </div>
            </FormSection>
          </div>

          {/* Right: image */}
          <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 p-5 h-fit lg:sticky lg:top-5">
            <ImageUploader
              value={form.image}
              onChange={(url) => update('image', url)}
              category="genre"
              label="Görsel"
              helperText="Kare oranlı · JPG · PNG · WebP · GIF · en fazla 5MB"
            />
          </div>
        </div>

        <FormActions
          cancelHref="/admin/genres"
          submitLabel={canPublish === false ? 'Onaya Gönder' : 'Kaydet'}
          submittingLabel={canPublish === false ? 'Gönderiliyor…' : 'Kaydediliyor…'}
          submitting={saving}
          disabled={!form.nameTr || !form.nameEn}
          extra={
            <DeleteButton
              variant="outline"
              endpoint={`/api/genres/${id}`}
              confirmMessage={`"${form.nameTr}" türünü silmek istediğinizden emin misiniz?`}
              onDeleted={() => router.push('/admin/genres')}
            />
          }
        />
      </form>
    </div>
  );
}
