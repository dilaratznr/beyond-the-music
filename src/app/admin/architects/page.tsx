'use client';

import { useEffect, useState } from 'react';
import Pagination from '@/components/admin/Pagination';

interface Architect { id: string; name: string; type: string; slug: string; image: string | null; _count: { artists: number }; }
const PER_PAGE = 15;

export default function ArchitectsPage() {
  const [items, setItems] = useState<Architect[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/architects?page=${page}&limit=${PER_PAGE}`).then((r) => r.json()).then((d) => { setItems(d.items || []); setTotal(d.total || 0); setLoading(false); });
  }, [page]);

  const typeLabel: Record<string, string> = { PRODUCER: 'Prodüktör', STUDIO: 'Stüdyo', MANAGER: 'Menajer', ARRANGER: 'Aranjör', RECORD_LABEL: 'Plak Şirketi' };

  return (
    <div>
      <div className="mb-5"><h1 className="text-lg font-bold text-zinc-900">Mimarlar</h1><p className="text-xs text-zinc-500">{total} mimar</p></div>
      {loading ? <p className="text-zinc-400 text-xs">Yükleniyor...</p> : (
        <>
          <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500 w-12"></th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">İsim</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Tip</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Sanatçı</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-50">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-2">{a.image ? <img src={a.image} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-zinc-100" />}</td>
                    <td className="px-4 py-2 font-medium text-zinc-900">{a.name}</td>
                    <td className="px-4 py-2"><span className="px-1.5 py-0.5 bg-zinc-100 rounded text-[9px] font-medium">{typeLabel[a.type] || a.type}</span></td>
                    <td className="px-4 py-2 text-zinc-500">{a._count.artists}</td>
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
