'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/admin/Toast';

export default function NewArtistPage() {
  const [form, setForm] = useState({ name: '', type: 'SOLO', bioTr: '', bioEn: '', birthDate: '', deathDate: '', genreIds: [] as string[] });
  const [genres, setGenres] = useState<{ id: string; nameTr: string }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/genres').then((r) => r.json()).then(setGenres);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/artists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); toast(data.error, 'error'); }
    else { toast('Sanatçı oluşturuldu'); router.push('/admin/artists'); }
  }

  function toggleGenre(id: string) {
    setForm((prev) => ({
      ...prev,
      genreIds: prev.genreIds.includes(id) ? prev.genreIds.filter((g) => g !== id) : [...prev.genreIds, id],
    }));
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Add New Artist</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow-sm border">
        {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none">
            <option value="SOLO">Solo</option>
            <option value="GROUP">Group/Band</option>
            <option value="COMPOSER">Composer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Genres</label>
          <div className="flex flex-wrap gap-2">
            {genres.filter((g) => !(g as { parentId?: string }).parentId).map((g) => (
              <button key={g.id} type="button" onClick={() => toggleGenre(g.id)}
                className={`px-3 py-1 rounded-full text-xs ${form.genreIds.includes(g.id) ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                {g.nameTr}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Bio (TR)</label>
          <textarea value={form.bioTr} onChange={(e) => setForm({ ...form, bioTr: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" rows={3} />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Bio (EN)</label>
          <textarea value={form.bioEn} onChange={(e) => setForm({ ...form, bioEn: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" rows={3} />
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-2.5 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Artist'}
        </button>
      </form>
    </div>
  );
}
