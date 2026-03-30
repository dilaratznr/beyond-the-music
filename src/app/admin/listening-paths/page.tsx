'use client';

import { useEffect, useState } from 'react';
import Pagination from '@/components/admin/Pagination';

interface LP { id: string; titleTr: string; type: string; slug: string; _count: { items: number }; }
const PER_PAGE = 15;

export default function ListeningPathsPage() {
  const [paths, setPaths] = useState<LP[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/listening-paths?page=${page}&limit=${PER_PAGE}`).then((r) => r.json()).then((d) => { setPaths(d.items || []); setTotal(d.total || 0); setLoading(false); });
  }, [page]);

  const typeLabel: Record<string, string> = { EMOTION: 'Duygu', ERA: 'Dönem', CITY: 'Şehir', CONTRAST: 'Kontrast', INTRO: 'Giriş', DEEP: 'Derin' };

  return (
    <div>
      <div className="mb-5"><h1 className="text-lg font-bold text-zinc-900">Dinleme Rotaları</h1><p className="text-xs text-zinc-500">{total} rota</p></div>
      {loading ? <p className="text-zinc-400 text-xs">Yükleniyor...</p> : (
        <>
          <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Başlık</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Tip</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Öğe</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-50">
                {paths.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-2 font-medium text-zinc-900">{p.titleTr}</td>
                    <td className="px-4 py-2"><span className="px-1.5 py-0.5 bg-teal-50 text-teal-600 rounded text-[9px] font-bold">{typeLabel[p.type] || p.type}</span></td>
                    <td className="px-4 py-2 text-zinc-500">{p._count.items}</td>
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
