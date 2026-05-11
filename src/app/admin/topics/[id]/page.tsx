'use client';

/**
 * Üst Başlık (Topic) düzenleme sayfası. Genre düzenleme sayfasından
 * uyarlandı; parent ilişkisi yok, ContentReview akışı 'ARTICLE_TOPIC'
 * section'ı altında çalışır.
 */
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
  FormSection,
  FormActions,
  FormError,
} from '@/components/admin/FormField';
import { translatePairs } from '@/lib/translate-client';
import { useCanPublish } from '@/components/admin/useCanPublish';
import ReviewNotice from '@/components/admin/ReviewNotice';

export default function EditTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    nameTr: '',
    nameEn: '',
    descriptionTr: '',
    descriptionEn: '',
    image: '',
    order: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState('');
  const [lastRejection, setLastRejection] = useState<{
    reviewNote: string | null;
    reviewedAt: string | null;
    reviewedBy: { name: string } | null;
  } | null>(null);
  const canPublish = useCanPublish('ARTICLE');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/topics/${id}`)
      .then((r) => r.json())
      .then((topic) => {
        if (cancelled) return;
        if (topic?.error) {
          setError(topic.error);
        } else {
          setForm({
            nameTr: topic.nameTr || '',
            nameEn: topic.nameEn || '',
            descriptionTr: topic.descriptionTr || '',
            descriptionEn: topic.descriptionEn || '',
            image: topic.image || '',
            order: topic.order ?? 0,
          });
          if (topic.lastRejection) setLastRejection(topic.lastRejection);
        }
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

    const res = await fetch(`/api/topics/${id}`, {
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
    toast('Üst başlık güncellendi');
    router.push('/admin/topics');
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
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Üst Başlık Düzenle</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            {form.nameTr || 'Üst başlık'} bilgilerini güncelle
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/topics"
            className="text-[12px] text-zinc-500 hover:text-zinc-100 transition-colors"
          >
            ← Tüm Üst Başlıklar
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError>{error}</FormError>}

        <ReviewNotice section="ARTICLE" canPublish={canPublish} lastRejection={lastRejection} />

        <div className="grid lg:grid-cols-[1fr_260px] gap-5">
          <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 p-5 space-y-5">
            <FormSection title="Temel Bilgiler">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel htmlFor="t-name-tr" required>
                    İsim (TR)
                  </FieldLabel>
                  <TextInput
                    id="t-name-tr"
                    value={form.nameTr}
                    onChange={(v) => update('nameTr', v)}
                    placeholder="örn. Soundtracks"
                    required
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="t-name-en" hint="Boş bırakırsan otomatik çevrilir">
                    İsim (EN)
                  </FieldLabel>
                  <TextInput
                    id="t-name-en"
                    value={form.nameEn}
                    onChange={(v) => update('nameEn', v)}
                    placeholder="e.g. Soundtracks"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[1fr_110px] gap-4">
                <div />
                <div>
                  <FieldLabel htmlFor="t-order" hint="Küçük → önce">
                    Sıra
                  </FieldLabel>
                  <TextInput
                    id="t-order"
                    type="number"
                    value={form.order}
                    onChange={(v) => update('order', Number(v) || 0)}
                    min={0}
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Açıklama" description="Üst başlığın altındaki makaleleri tanıtan kısa metin">
              <div>
                <FieldLabel htmlFor="t-desc-tr">Açıklama (TR)</FieldLabel>
                <TextArea
                  id="t-desc-tr"
                  value={form.descriptionTr}
                  onChange={(v) => update('descriptionTr', v)}
                  placeholder="Bu üst başlık ne anlatır..."
                  rows={3}
                />
              </div>
              <div>
                <FieldLabel htmlFor="t-desc-en">Açıklama (EN)</FieldLabel>
                <TextArea
                  id="t-desc-en"
                  value={form.descriptionEn}
                  onChange={(v) => update('descriptionEn', v)}
                  placeholder="Short English description..."
                  rows={3}
                />
              </div>
            </FormSection>
          </div>

          <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 p-5 h-fit lg:sticky lg:top-5">
            <ImageUploader
              value={form.image}
              onChange={(url) => update('image', url)}
              category="topic"
              label="Görsel"
              helperText="Kare oranlı · JPG · PNG · WebP · GIF · en fazla 5MB"
            />
          </div>
        </div>

        <FormActions
          cancelHref="/admin/topics"
          submitLabel={canPublish === false ? 'Onaya Gönder' : 'Kaydet'}
          submittingLabel={translating ? 'Çevriliyor…' : canPublish === false ? 'Gönderiliyor…' : 'Kaydediliyor…'}
          submitting={saving}
          disabled={!form.nameTr || !form.nameEn}
          extra={
            <DeleteButton
              variant="outline"
              endpoint={`/api/topics/${id}`}
              confirmMessage={`"${form.nameTr}" üst başlığını silmek istediğinizden emin misiniz?`}
              onDeleted={() => router.push('/admin/topics')}
            />
          }
        />
      </form>
    </div>
  );
}
