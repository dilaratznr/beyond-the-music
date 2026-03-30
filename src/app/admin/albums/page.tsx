'use client';

import { useEffect, useState } from 'react';
import Pagination from '@/components/admin/Pagination';

interface Album { id: string; title: string; slug: string; coverImage: string | null; artist: { name: string }; _count: { songs: number }; releaseDate: string | null; }
const PER_PAGE = 15;

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/albums?page=${page}&limit=${PER_PAGE}`).then((r) => r.json()).then((d) => { setAlbums(d.items || []); setTotal(d.total || 0); setLoading(false); });
  }, [page]);

  return (
    <div>
      <div className="mb-5"><h1 className="text-lg font-bold text-zinc-900">Albümler</h1><p className="text-xs text-zinc-500">{total} albüm</p></div>
      {loading ? <p className="text-zinc-400 text-xs">Yükleniyor...</p> : (
        <>
          <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500 w-12"></th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Albüm</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Sanatçı</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Şarkı</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Yıl</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-50">
                {albums.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-2">{a.coverImage ? <img src={a.coverImage} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-zinc-100" />}</td>
                    <td className="px-4 py-2 font-medium text-zinc-900">{a.title}</td>
                    <td className="px-4 py-2 text-zinc-500">{a.artist.name}</td>
                    <td className="px-4 py-2 text-zinc-500">{a._count.songs}</td>
                    <td className="px-4 py-2 text-zinc-400">{a.releaseDate ? new Date(a.releaseDate).getFullYear() : '—'}</td>
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
