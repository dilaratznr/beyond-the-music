'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Pagination from '@/components/admin/Pagination';

interface Genre { id: string; slug: string; nameTr: string; nameEn: string; image: string | null; parentId: string | null; _count: { artists: number; articles: number }; }

const PER_PAGE = 15;

export default function GenresPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/genres?page=${page}&limit=${PER_PAGE}`)
      .then((r) => r.json())
      .then((d) => { setGenres(d.items || []); setTotal(d.total || 0); setLoading(false); });
  }, [page]);

  const main = genres.filter((g) => !g.parentId);
  const subs = genres.filter((g) => g.parentId);
  const sorted = [...main, ...subs];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Türler</h1>
          <p className="text-xs text-zinc-500">{total} tür</p>
        </div>
        <Link href="/admin/genres/new" className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800">+ Yeni Tür</Link>
      </div>

      {loading ? <p className="text-zinc-400 text-xs">Yükleniyor...</p> : (
        <>
          <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="text-left px-4 py-2.5 font-medium text-zinc-500 w-12"></th>
                  <th className="text-left px-4 py-2.5 font-medium text-zinc-500">İsim (TR)</th>
                  <th className="text-left px-4 py-2.5 font-medium text-zinc-500">İsim (EN)</th>
                  <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Tip</th>
                  <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Sanatçı</th>
                  <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Makale</th>
                  <th className="text-right px-4 py-2.5 font-medium text-zinc-500 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {sorted.map((g) => (
                  <tr key={g.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-2">
                      {g.image ? <img src={g.image} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-zinc-100" />}
                    </td>
                    <td className="px-4 py-2 font-medium text-zinc-900">{g.parentId ? <span className="text-zinc-400">↳ </span> : ''}{g.nameTr}</td>
                    <td className="px-4 py-2 text-zinc-500">{g.nameEn}</td>
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${g.parentId ? 'bg-zinc-100 text-zinc-500' : 'bg-blue-50 text-blue-600'}`}>{g.parentId ? 'ALT' : 'ANA'}</span>
                    </td>
                    <td className="px-4 py-2 text-zinc-500">{g._count.artists}</td>
                    <td className="px-4 py-2 text-zinc-500">{g._count.articles}</td>
                    <td className="px-4 py-2 text-right"><Link href={`/tr/genre/${g.slug}`} className="text-zinc-400 hover:text-zinc-700">↗</Link></td>
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
