'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/admin/Toast';
import ImageUploader from '@/components/admin/ImageUploader';
import { useCanPublish } from '@/components/admin/useCanPublish';

const TYPES = [
  { v: 'EMOTION', l: 'Duygu' },
  { v: 'ERA', l: 'Dönem' },
  { v: 'CITY', l: 'Şehir' },
  { v: 'CONTRAST', l: 'Kontrast' },
  { v: 'INTRO', l: 'Giriş' },
  { v: 'DEEP', l: 'Derin' },
];

export default function NewListeningPathPage() {
  const [form, setForm] = useState({
    titleTr: '',
    titleEn: '',
    type: 'EMOTION',
    descriptionTr: '',
    descriptionEn: '',
    image: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const canPublish = useCanPublish('LISTENING_PATH');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/listening-paths', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, image: form.image || null }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Kaydedilemedi');
      toast(data.error || 'Kaydedilemedi', 'error');
    } else {
      toast('Rota oluşturuldu');
      router.push('/admin/listening-paths');
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-zinc-100 tracking-tight mb-6">Yeni Dinleme Rotası</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-900/40 p-6 rounded-lg border border-zinc-800">
        {error && <div className="p-3 bg-zinc-900/60 border border-zinc-800 border-l-2 border-l-rose-400 text-zinc-200 text-sm rounded-lg">{error}</div>}
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
        <button type="submit" disabled={loading}
          className="w-full py-2.5 bg-white text-zinc-950 rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50">
          {loading
            ? canPublish === false
              ? 'Gönderiliyor…'
              : 'Kaydediliyor…'
            : canPublish === false
              ? 'Onaya Gönder'
              : 'Rota Oluştur'}
        </button>
      </form>
    </div>
  );
}
