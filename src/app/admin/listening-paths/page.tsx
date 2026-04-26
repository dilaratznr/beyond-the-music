'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import Pagination from '@/components/admin/Pagination';
import DeleteButton from '@/components/admin/DeleteButton';
import { IconExternal } from '@/components/admin/Icons';
import { TableSkeleton } from '@/components/admin/Loading';
import StatusPill from '@/components/admin/StatusPill';

interface LP {
  id: string;
  titleTr: string;
  type: string;
  slug: string;
  status: string;
  _count: { items: number };
}
const PER_PAGE = 15;

const TYPE_LABEL: Record<string, string> = {
  EMOTION: 'Duygu',
  ERA: 'Dönem',
  CITY: 'Şehir',
  CONTRAST: 'Kontrast',
  INTRO: 'Giriş',
  DEEP: 'Derin',
};

// Type renkleri kaldırıldı — yoğun renk şeması "AI üretimi" hissi
// veriyordu. Her type için ayrı renkli pill dergi/editoryal tona uymuyor.
// Artık tek ton, ince border, uppercase tracking — kategori rengiyle
// değil metniyle okunuyor.
const TYPE_PILL_CLASSNAME =
  'inline-flex items-center px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-900/40 text-[10px] uppercase tracking-[0.15em] font-medium text-zinc-400';

export default function ListeningPathsPage() {
  const [page, setPage] = useState(1);

  const { data: response, mutate, isLoading } = useSWR<{ items: LP[]; total: number }>(
    `/api/listening-paths?page=${page}&limit=${PER_PAGE}`,
  );
  // total ve paths SWR cache'inden derive — state'te tutmaya gerek yok
  // (önceki sürümde setTotal render sırasında çağrılıp sonsuz loop yapıyordu).
  const paths = response?.items ?? [];
  const total = response?.total ?? 0;

  const reload = useCallback(() => {
    mutate();
  }, [mutate]);

  const goToPage = useCallback((p: number) => {
    setPage(p);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Dinleme Rotaları</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">{total} rota</p>
        </div>
        <Link
          href="/admin/listening-paths/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-zinc-950 rounded-md text-xs font-semibold hover:bg-zinc-200 transition-colors"
        >
          + Yeni Rota
        </Link>
      </div>
      {isLoading ? (
        <TableSkeleton rows={PER_PAGE} />
      ) : (
        <>
          <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-900/80 border-b border-zinc-800">
                  <th className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-zinc-500">Başlık</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-zinc-500 w-28">Tip</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-zinc-500 w-20">Öğe</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-zinc-500 w-40">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {paths.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 text-xs">
                      Henüz rota yok.
                    </td>
                  </tr>
                )}
                {paths.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-2 font-medium text-zinc-100">
                      <div className="flex items-center gap-2">
                        {p.titleTr}
                        {p.status && p.status !== 'PUBLISHED' && (
                          <StatusPill status={p.status} compact />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={TYPE_PILL_CLASSNAME}>
                        {TYPE_LABEL[p.type] || p.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-400">{p._count.items}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/tr/listening-paths/${p.slug}`}
                          target="_blank"
                          className="text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                          aria-label="Sitede aç"
                          title="Sitede aç"
                        >
                          <IconExternal size={13} />
                        </Link>
                        <Link
                          href={`/admin/listening-paths/${p.id}`}
                          className="text-zinc-300 hover:text-white hover:bg-zinc-800 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
                        >
                          Düzenle
                        </Link>
                        <DeleteButton
                          endpoint={`/api/listening-paths/${p.id}`}
                          confirmMessage={`"${p.titleTr}" rotasını silmek istediğinizden emin misiniz?`}
                          entityName={p.titleTr}
                          entityKind="Rota"
                          onDeleted={reload}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={Math.ceil(total / PER_PAGE)}
            onPageChange={goToPage}
            total={total}
            perPage={PER_PAGE}
          />
        </>
      )}
    </div>
  );
}
