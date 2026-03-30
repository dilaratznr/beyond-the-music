'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Pagination from '@/components/admin/Pagination';

interface Article { id: string; slug: string; titleTr: string; category: string; status: string; createdAt: string; author: { name: string }; }
const PER_PAGE = 15;

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
    if (filter) params.set('status', filter);
    fetch(`/api/articles?${params}`).then((r) => r.json()).then((d) => { setArticles(d.items || []); setTotal(d.total || 0); setLoading(false); });
  }, [page, filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-lg font-bold text-zinc-900">Makaleler</h1><p className="text-xs text-zinc-500">{total} makale</p></div>
        <Link href="/admin/articles/new" className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800">+ Yeni Makale</Link>
      </div>

      <div className="flex gap-1.5 mb-4">
        {[{ v: '', l: 'Tümü' }, { v: 'PUBLISHED', l: 'Yayında' }, { v: 'DRAFT', l: 'Taslak' }].map((f) => (
          <button key={f.v} onClick={() => { setFilter(f.v); setPage(1); }}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium ${filter === f.v ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-500 border border-zinc-200'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {loading ? <p className="text-zinc-400 text-xs">Yükleniyor...</p> : (
        <>
          <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Başlık</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Kategori</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Durum</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Yazar</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Tarih</th>
                <th className="text-right px-4 py-2.5 font-medium text-zinc-500 w-12"></th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-50">
                {articles.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-2 font-medium text-zinc-900 max-w-[250px] truncate">{a.titleTr}</td>
                    <td className="px-4 py-2"><span className="px-1.5 py-0.5 bg-zinc-100 rounded text-[9px] font-medium">{a.category.replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-2"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${a.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{a.status === 'PUBLISHED' ? 'Yayında' : 'Taslak'}</span></td>
                    <td className="px-4 py-2 text-zinc-500">{a.author.name}</td>
                    <td className="px-4 py-2 text-zinc-400">{new Date(a.createdAt).toLocaleDateString('tr-TR')}</td>
                    <td className="px-4 py-2 text-right"><Link href={`/tr/article/${a.slug}`} className="text-zinc-400 hover:text-zinc-700">↗</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} onPageChange={setPage} total={total} perPage={PER_PAGE} />
        </>
      )}
    </div>
  );
}
