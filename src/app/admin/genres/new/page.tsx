'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/admin/Toast';
import ImageUploader from '@/components/admin/ImageUploader';
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

interface ParentOption {
  id: string;
  nameTr: string;
}

export default function NewGenrePage() {
  const [form, setForm] = useState({
    nameTr: '',
    nameEn: '',
    descriptionTr: '',
    descriptionEn: '',
    image: '',
    parentId: '',
    order: 0,
  });
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [translating, setTranslating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/genres?all=true')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(data)
          ? (data as Array<{ id: string; nameTr: string; parentId: string | null }>)
          : [];
        setParents(
          list
            .filter((g) => !g.parentId)
            .map((g) => ({ id: g.id, nameTr: g.nameTr }))
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(<K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Auto-translate nameTr → nameEn and descriptionTr → descriptionEn when
    // the EN side is empty. Name is a single noun phrase, description is prose.
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

    const res = await fetch('/api/genres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        ...translations,
        image: form.image || null,
        parentId: form.parentId || null,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || 'Kaydedilemedi');
      toast(data.error || 'Kaydedilemedi', 'error');
      return;
    }
    toast('Tür oluşturuldu');
    router.push('/admin/genres');
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Yeni Tür</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Yeni bir müzik türü ekle. TR ve EN isim zorunlu, diğer alanlar opsiyonel.
          </p>
        </div>
        <Link
          href="/admin/genres"
          className="text-[12px] text-zinc-500 hover:text-zinc-100 transition-colors"
        >
          ← Tüm Türler
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError>{error}</FormError>}

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
                    autoFocus
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
          submitLabel="Tür Oluştur"
          submittingLabel={translating ? 'Çevriliyor…' : 'Oluşturuluyor…'}
          submitting={submitting}
          disabled={!form.nameTr}
        />
      </form>
    </div>
  );
}
