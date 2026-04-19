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

const TYPES = [
  { v: 'PRODUCER', l: 'Prodüktör' },
  { v: 'STUDIO', l: 'Stüdyo' },
  { v: 'MANAGER', l: 'Menajer' },
  { v: 'ARRANGER', l: 'Aranjör' },
  { v: 'RECORD_LABEL', l: 'Plak Şirketi' },
];

export default function EditArchitectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    type: 'PRODUCER',
    bioTr: '',
    bioEn: '',
    image: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/architects/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.error) {
          setError(data.error);
        } else {
          setForm({
            name: data.name || '',
            type: data.type || 'PRODUCER',
            bioTr: data.bioTr || '',
            bioEn: data.bioEn || '',
            image: data.image || '',
          });
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
      { key: 'bioEn', sourceText: form.bioTr, targetText: form.bioEn },
    ]);
    setTranslating(false);

    const res = await fetch(`/api/architects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, ...translations, image: form.image || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || 'Güncellenemedi');
      toast(data.error || 'Güncellenemedi', 'error');
      return;
    }
    toast('Mimar güncellendi');
    router.push('/admin/architects');
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
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Mimar Düzenle</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">{form.name || 'Mimar'} bilgilerini güncelle</p>
        </div>
        <Link
          href="/admin/architects"
          className="text-[12px] text-zinc-500 hover:text-zinc-100 transition-colors"
        >
          ← Tüm Mimarlar
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError>{error}</FormError>}

        <div className="grid lg:grid-cols-[1fr_260px] gap-5">
          {/* Left: main fields */}
          <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 p-5 space-y-5">
            <FormSection title="Temel Bilgiler">
              <div className="grid grid-cols-[1fr_200px] gap-4">
                <div>
                  <FieldLabel htmlFor="arc-name" required>
                    İsim
                  </FieldLabel>
                  <TextInput
                    id="arc-name"
                    value={form.name}
                    onChange={(v) => update('name', v)}
                    placeholder="örn. Arif Mardin"
                    required
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="arc-type">Tip</FieldLabel>
                  <Select
                    id="arc-type"
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

            <FormSection title="Biyografi" description="Kısa tanıtım metinleri. TR ve EN doldurmanız önerilir.">
              <div>
                <FieldLabel htmlFor="arc-bio-tr" hint="Türkçe">
                  Biyografi (TR)
                </FieldLabel>
                <TextArea
                  id="arc-bio-tr"
                  value={form.bioTr}
                  onChange={(v) => update('bioTr', v)}
                  placeholder="Bu mimarın öyküsü, etkileri, öne çıkan işleri..."
                  rows={4}
                />
              </div>
              <div>
                <FieldLabel htmlFor="arc-bio-en" hint="English">
                  Biyografi (EN)
                </FieldLabel>
                <TextArea
                  id="arc-bio-en"
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
              category="architect"
              label="Mimar Görseli"
              aspect="portrait"
              helperText="Portre oranlı · JPG · PNG · WebP · en fazla 5MB"
            />
          </div>
        </div>

        <FormActions
          cancelHref="/admin/architects"
          submitLabel="Kaydet"
          submittingLabel={translating ? 'Çevriliyor…' : 'Kaydediliyor…'}
          submitting={saving}
          disabled={!form.name}
          extra={
            <DeleteButton
              variant="outline"
              endpoint={`/api/architects/${id}`}
              confirmMessage={`"${form.name}" mimarını silmek istediğinizden emin misiniz?`}
              onDeleted={() => router.push('/admin/architects')}
            />
          }
        />
      </form>
    </div>
  );
}
