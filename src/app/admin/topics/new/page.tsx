'use client';

/**
 * Yeni Üst Başlık (Topic) oluşturma formu. Genre/new pattern'inden
 * uyarlandı — parent-child hiyerarşisi yok, hepsi düz.
 */
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/admin/Toast';
import ImageUploader from '@/components/admin/ImageUploader';
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

export default function NewTopicPage() {
  const [form, setForm] = useState({
    nameTr: '',
    nameEn: '',
    descriptionTr: '',
    descriptionEn: '',
    image: '',
    order: 0,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [translating, setTranslating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  // Topic da Article'la aynı permission section'ında yaşar — ayrı bir
  // bayrak tanımlamadık (Topic, Article'ın gruplaması olarak modellendi).
  const canPublish = useCanPublish('ARTICLE');

  const update = useCallback(<K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
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

    const res = await fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        ...translations,
        image: form.image || null,
      }),
    });

    let data: { error?: string } = {};
    try {
      data = await res.json();
    } catch {
      data = { error: 'Sunucu yanıtı çözümlenemedi (yeniden deneyin)' };
    }
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || 'Kaydedilemedi');
      toast(data.error || 'Kaydedilemedi', 'error');
      return;
    }
    toast('Üst başlık oluşturuldu');
    router.push('/admin/topics');
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Yeni Üst Başlık</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Makaleleri gruplayacağın yeni bir başlık ekle. TR ve EN isim zorunlu.
          </p>
        </div>
        <Link
          href="/admin/topics"
          className="text-[12px] text-zinc-500 hover:text-zinc-100 transition-colors"
        >
          ← Tüm Üst Başlıklar
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError>{error}</FormError>}

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
                    autoFocus
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
                <div className="text-[11px] text-zinc-500 self-end pb-2">
                  Makale formunda &quot;Üst Başlık&quot; alanından bu başlığı seçebilirsin.
                </div>
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
                  placeholder="Bu üst başlık ne anlatır, hangi makaleleri kapsar..."
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
          submitLabel={canPublish === false ? 'Onaya Gönder' : 'Üst Başlık Oluştur'}
          submittingLabel={translating ? 'Çevriliyor…' : canPublish === false ? 'Gönderiliyor…' : 'Oluşturuluyor…'}
          submitting={submitting}
          // Sadece TR şart — EN boşsa translatePairs otomatik çevirir
          // (Genre /new pattern'iyle aynı). Çeviri fail ederse server
          // "Name (TR/EN) required" toast'ı bildirir.
          disabled={!form.nameTr}
        />
      </form>
    </div>
  );
}
