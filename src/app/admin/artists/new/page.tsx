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

export default function NewArtistPage() {
  const [form, setForm] = useState({
    name: '',
    type: 'SOLO',
    bioTr: '',
    bioEn: '',
    image: '',
    genreIds: [] as string[],
  });
  const [genres, setGenres] = useState<GenreOption[]>([]);
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
        setGenres(Array.isArray(data) ? (data as GenreOption[]) : []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(<K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  function toggleGenre(id: string) {
    setForm((prev) => ({
      ...prev,
      genreIds: prev.genreIds.includes(id)
        ? prev.genreIds.filter((g) => g !== id)
        : [...prev.genreIds, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitting(true);
    setError('');

    // Auto-translate TR → EN for any bilingual field where the EN side is
    // empty but the TR side has content. Fails open (saves with empty EN)
    // if the model call errors out.
    setTranslating(true);
    const translations = await translatePairs([
      { key: 'bioEn', sourceText: form.bioTr, targetText: form.bioEn },
    ]);
    setTranslating(false);

    const res = await fetch('/api/artists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        ...translations,
        image: form.image || null,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || 'Kaydedilemedi');
      toast(data.error || 'Kaydedilemedi', 'error');
      return;
    }
    toast('Sanatçı oluşturuldu');
    router.push('/admin/artists');
  }

  const topLevelGenres = genres.filter((g) => !g.parentId);

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Yeni Sanatçı</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Yeni bir sanatçı ekle — solo, grup veya besteci.
          </p>
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
                    autoFocus
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
          submitLabel="Sanatçı Oluştur"
          submittingLabel={translating ? 'Çevriliyor…' : 'Oluşturuluyor…'}
          submitting={submitting}
          disabled={!form.name}
        />
      </form>
    </div>
  );
}
