'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Pagination from '@/components/admin/Pagination';

interface Artist { id: string; name: string; type: string; slug: string; image: string | null; genres: { genre: { nameTr: string } }[]; _count: { albums: number; articles: number }; }
const PER_PAGE = 15;

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/artists?page=${page}&limit=${PER_PAGE}`).then((r) => r.json()).then((d) => { setArtists(d.items || []); setTotal(d.total || 0); setLoading(false); });
  }, [page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-lg font-bold text-zinc-900">Sanatçılar</h1><p className="text-xs text-zinc-500">{total} sanatçı</p></div>
        <Link href="/admin/artists/new" className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800">+ Yeni Sanatçı</Link>
      </div>
      {loading ? <p className="text-zinc-400 text-xs">Yükleniyor...</p> : (
        <>
          <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500 w-12"></th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">İsim</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Tip</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Türler</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Albüm</th>
                <th className="text-right px-4 py-2.5 font-medium text-zinc-500 w-12"></th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-50">
                {artists.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-2">{a.image ? <img src={a.image} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center text-zinc-400 text-[10px]">♪</div>}</td>
                    <td className="px-4 py-2 font-medium text-zinc-900">{a.name}</td>
                    <td className="px-4 py-2"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${a.type === 'SOLO' ? 'bg-violet-50 text-violet-600' : a.type === 'GROUP' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{a.type}</span></td>
                    <td className="px-4 py-2 text-zinc-500">{a.genres.map((g) => g.genre.nameTr).join(', ') || '—'}</td>
                    <td className="px-4 py-2 text-zinc-500">{a._count.albums}</td>
                    <td className="px-4 py-2 text-right"><Link href={`/tr/artist/${a.slug}`} className="text-zinc-400 hover:text-zinc-700">↗</Link></td>
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
