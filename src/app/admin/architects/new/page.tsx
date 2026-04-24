'use client';

import { useCallback, useState } from 'react';
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
import { useCanPublish } from '@/components/admin/useCanPublish';

const TYPES = [
  { v: 'PRODUCER', l: 'Prodüktör' },
  { v: 'STUDIO', l: 'Stüdyo' },
  { v: 'MANAGER', l: 'Menajer' },
  { v: 'ARRANGER', l: 'Aranjör' },
  { v: 'RECORD_LABEL', l: 'Plak Şirketi' },
];

export default function NewArchitectPage() {
  const [form, setForm] = useState({
    name: '',
    type: 'PRODUCER',
    bioTr: '',
    bioEn: '',
    image: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [translating, setTranslating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const canPublish = useCanPublish('ARCHITECT');

  const update = useCallback(<K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    setTranslating(true);
    const translations = await translatePairs([
      { key: 'bioEn', sourceText: form.bioTr, targetText: form.bioEn },
    ]);
    setTranslating(false);

    const res = await fetch('/api/architects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, ...translations, image: form.image || null }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || 'Kaydedilemedi');
      toast(data.error || 'Kaydedilemedi', 'error');
      return;
    }
    toast('Mimar oluşturuldu');
    router.push('/admin/architects');
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Yeni Mimar</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Yeni bir mimar ekle — prodüktör, stüdyo, menajer, aranjör veya plak şirketi.
          </p>
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
                    autoFocus
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
          submitLabel={canPublish === false ? 'Onaya Gönder' : 'Mimar Oluştur'}
          submittingLabel={translating ? 'Çevriliyor…' : canPublish === false ? 'Gönderiliyor…' : 'Oluşturuluyor…'}
          submitting={submitting}
          disabled={!form.name}
        />
      </form>
    </div>
  );
}
