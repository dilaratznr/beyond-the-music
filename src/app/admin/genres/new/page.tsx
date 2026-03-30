'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/admin/Toast';

export default function NewGenrePage() {
  const [form, setForm] = useState({ nameTr: '', nameEn: '', descriptionTr: '', descriptionEn: '', parentId: '', order: 0 });
  const [parentGenres, setParentGenres] = useState<{ id: string; nameTr: string }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/genres').then((r) => r.json()).then((data) => {
      setParentGenres(data.filter((g: { parentId: string | null }) => !g.parentId));
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/genres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, parentId: form.parentId || null }),
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); toast(data.error, 'error'); }
    else { toast('Tür oluşturuldu'); router.push('/admin/genres'); }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Add New Genre</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow-sm border">
        {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Name (TR)</label>
            <input type="text" value={form.nameTr} onChange={(e) => setForm({ ...form, nameTr: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Name (EN)</label>
            <input type="text" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Parent Genre (optional - for subgenres)</label>
          <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none">
            <option value="">None (Main Genre)</option>
            {parentGenres.map((g) => <option key={g.id} value={g.id}>{g.nameTr}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Description (TR)</label>
          <textarea value={form.descriptionTr} onChange={(e) => setForm({ ...form, descriptionTr: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" rows={3} />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Description (EN)</label>
          <textarea value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" rows={3} />
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-2.5 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Genre'}
        </button>
      </form>
    </div>
  );
}
