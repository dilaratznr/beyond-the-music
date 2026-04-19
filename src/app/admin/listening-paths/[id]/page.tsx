'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/admin/Toast';
import DeleteButton from '@/components/admin/DeleteButton';
import ImageUploader from '@/components/admin/ImageUploader';
import { FormSkeleton } from '@/components/admin/Loading';
import ListeningPathItems from '@/components/admin/ListeningPathItems';

const TYPES = [
  { v: 'EMOTION', l: 'Duygu' },
  { v: 'ERA', l: 'Dönem' },
  { v: 'CITY', l: 'Şehir' },
  { v: 'CONTRAST', l: 'Kontrast' },
  { v: 'INTRO', l: 'Giriş' },
  { v: 'DEEP', l: 'Derin' },
];

export default function EditListeningPathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    titleTr: '',
    titleEn: '',
    type: 'EMOTION',
    descriptionTr: '',
    descriptionEn: '',
    image: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/listening-paths/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) setError(data.error);
        else {
          setForm({
            titleTr: data.titleTr || '',
            titleEn: data.titleEn || '',
            type: data.type || 'EMOTION',
            descriptionTr: data.descriptionTr || '',
            descriptionEn: data.descriptionEn || '',
            image: data.image || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch(`/api/listening-paths/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, image: form.image || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || 'Güncellenemedi');
      toast(data.error || 'Güncellenemedi', 'error');
    } else {
      toast('Rota güncellendi');
      router.push('/admin/listening-paths');
    }
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
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Rota Düzenle</h1>
        <div className="flex gap-2 items-center">
          <Link href="/admin/listening-paths" className="text-zinc-500 hover:text-zinc-100 text-sm">← Geri</Link>
          <DeleteButton
            endpoint={`/api/listening-paths/${id}`}
            confirmMessage={`"${form.titleTr}" rotasını silmek istediğinizden emin misiniz?`}
            onDeleted={() => router.push('/admin/listening-paths')}
          />
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-900/40 p-6 rounded-lg border border-zinc-800 max-w-2xl">
        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-lg">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="lp-title-tr" className="block text-sm font-semibold text-zinc-100 tracking-tight mb-1">Başlık (TR)</label>
            <input id="lp-title-tr" type="text" value={form.titleTr} onChange={(e) => setForm({ ...form, titleTr: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg outline-none text-zinc-100 placeholder:text-zinc-600 focus:ring-zinc-500/20 focus:ring-2" required />
          </div>
          <div>
            <label htmlFor="lp-title-en" className="block text-sm font-semibold text-zinc-100 tracking-tight mb-1">Başlık (EN)</label>
            <input id="lp-title-en" type="text" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg outline-none text-zinc-100 placeholder:text-zinc-600 focus:ring-zinc-500/20 focus:ring-2" required />
          </div>
        </div>
        <div>
          <label htmlFor="lp-type" className="block text-sm font-semibold text-zinc-100 tracking-tight mb-1">Tip</label>
          <select id="lp-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg outline-none text-zinc-100 placeholder:text-zinc-600 focus:ring-zinc-500/20 focus:ring-2">
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>
        <ImageUploader
          value={form.image}
          onChange={(url) => setForm({ ...form, image: url })}
          category="listening-path"
          label="Rota Görseli"
          aspect="wide"
        />
        <div>
          <label htmlFor="lp-desc-tr" className="block text-sm font-semibold text-zinc-100 tracking-tight mb-1">Açıklama (TR)</label>
          <textarea id="lp-desc-tr" value={form.descriptionTr} onChange={(e) => setForm({ ...form, descriptionTr: e.target.value })}
            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg outline-none text-zinc-100 placeholder:text-zinc-600 focus:ring-zinc-500/20 focus:ring-2" rows={3} />
        </div>
        <div>
          <label htmlFor="lp-desc-en" className="block text-sm font-semibold text-zinc-100 tracking-tight mb-1">Açıklama (EN)</label>
          <textarea id="lp-desc-en" value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg outline-none text-zinc-100 placeholder:text-zinc-600 focus:ring-zinc-500/20 focus:ring-2" rows={3} />
        </div>
        <button type="submit" disabled={saving}
          className="w-full py-2.5 bg-white text-zinc-950 rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50">
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </form>

      <div className="mt-6 max-w-4xl bg-zinc-900/40 p-6 rounded-lg border border-zinc-800">
        <ListeningPathItems pathId={id} />
      </div>
    </div>
  );
}
