'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/admin/Toast';
import dynamic from 'next/dynamic';

const RichEditor = dynamic(() => import('@/components/admin/RichEditor'), { ssr: false });

const CATEGORIES = [
  'GENRE', 'CULTURAL_IMPACT', 'SUBCULTURE', 'CURATED_MOVEMENT',
  'THEORY', 'LISTENING_PATH', 'AI_MUSIC', 'DEEP_CUT', 'FASHION',
];

export default function NewArticlePage() {
  const [activeTab, setActiveTab] = useState<'tr' | 'en'>('tr');
  const [form, setForm] = useState({
    titleTr: '', titleEn: '', contentTr: '', contentEn: '',
    category: 'GENRE', status: 'DRAFT', relatedGenreId: '', relatedArtistId: '',
  });
  const [genres, setGenres] = useState<{ id: string; nameTr: string }[]>([]);
  const [artists, setArtists] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/genres?all=true').then((r) => r.json()).then(setGenres);
    fetch('/api/artists?all=true').then((r) => r.json()).then(setArtists);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, relatedGenreId: form.relatedGenreId || null, relatedArtistId: form.relatedArtistId || null }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); toast(data.error, 'error'); }
    else { toast('Makale oluşturuldu'); router.push('/admin/articles'); }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">New Article</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

        {/* Meta */}
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Related Genre</label>
              <select value={form.relatedGenreId} onChange={(e) => setForm({ ...form, relatedGenreId: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none">
                <option value="">None</option>
                {genres.map((g) => <option key={g.id} value={g.id}>{g.nameTr}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Related Artist</label>
              <select value={form.relatedArtistId} onChange={(e) => setForm({ ...form, relatedArtistId: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none">
                <option value="">None</option>
                {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Language Tabs */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="flex border-b">
            <button type="button" onClick={() => setActiveTab('tr')}
              className={`flex-1 py-3 text-sm font-medium ${activeTab === 'tr' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}>
              Turkce
            </button>
            <button type="button" onClick={() => setActiveTab('en')}
              className={`flex-1 py-3 text-sm font-medium ${activeTab === 'en' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}>
              English
            </button>
          </div>
          <div className="p-6 space-y-4">
            {activeTab === 'tr' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Title (TR)</label>
                  <input type="text" value={form.titleTr} onChange={(e) => setForm({ ...form, titleTr: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none text-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Content (TR)</label>
                  <RichEditor content={form.contentTr} onChange={(v) => setForm({ ...form, contentTr: v })} placeholder="Turkce icerik yazin..." />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Title (EN)</label>
                  <input type="text" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none text-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Content (EN)</label>
                  <RichEditor content={form.contentEn} onChange={(v) => setForm({ ...form, contentEn: v })} placeholder="Write English content..." />
                </div>
              </>
            )}
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 disabled:opacity-50 text-lg">
          {loading ? 'Saving...' : form.status === 'PUBLISHED' ? 'Publish Article' : 'Save Draft'}
        </button>
      </form>
    </div>
  );
}
