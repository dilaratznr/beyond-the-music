'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import Pagination from '@/components/admin/Pagination';
import DeleteButton from '@/components/admin/DeleteButton';
import StatusPill from '@/components/admin/StatusPill';

interface Architect {
  id: string;
  name: string;
  type: string;
  slug: string;
  image: string | null;
  status: string;
  _count: { artists: number };
}
const PER_PAGE = 15;

const TYPE_LABEL: Record<string, string> = {
  PRODUCER: 'Prodüktör',
  STUDIO: 'Stüdyo',
  MANAGER: 'Menajer',
  ARRANGER: 'Aranjör',
  RECORD_LABEL: 'Plak Şirketi',
};

// Type renkleri kaldırıldı (editoryal tutarlılık). Tek ton + uppercase
// tracking. Bkz. listening-paths ve artists sayfasıyla aynı pattern.
const TYPE_PILL_CLASSNAME =
  'px-2 py-0.5 backdrop-blur-md bg-black/50 text-[10px] uppercase tracking-[0.15em] font-medium rounded-full ring-1 ring-inset ring-white/15 text-white/80';

export default function ArchitectsPage() {
  const [page, setPage] = useState(1);

  const { data: response, mutate, isLoading } = useSWR<{ items: Architect[]; total: number }>(
    `/api/architects?page=${page}&limit=${PER_PAGE}`,
  );
  const items = response?.items ?? [];
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
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Mimarlar</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">{total} mimar</p>
        </div>
        <Link
          href="/admin/architects/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-zinc-950 rounded-md text-xs font-semibold hover:bg-zinc-200 transition-colors"
        >
          + Yeni Mimar
        </Link>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: PER_PAGE }).map((_, i) => (
            <div
              key={i}
              className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden"
            >
              <div className="aspect-square bg-zinc-800/60 animate-pulse" />
              <div className="p-3 space-y-1.5">
                <div className="h-3 bg-zinc-800/60 rounded animate-pulse w-4/5" />
                <div className="h-2.5 bg-zinc-800/60 rounded animate-pulse w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/40 rounded-lg border border-zinc-800">
          <p className="text-sm text-zinc-100 font-medium">Henüz mimar eklenmedi</p>
          <p className="text-xs text-zinc-500 mt-1">Sağ üstten yeni bir mimar ekleyebilirsin</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((a) => (
              <div
                key={a.id}
                className="group relative bg-zinc-900/40 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all overflow-hidden"
              >
                <Link
                  href={`/admin/architects/${a.id}`}
                  className="block aspect-square bg-zinc-900 relative overflow-hidden"
                  aria-label={`${a.name} düzenle`}
                >
                  {a.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={a.image}
                      alt={a.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden="true"
                      >
                        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
                      </svg>
                    </div>
                  )}
                  {/* overlay bottom gradient */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  {/* artist count pill */}
                  {a._count.artists > 0 && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-zinc-200 text-[10px] font-medium rounded ring-1 ring-white/10">
                      {a._count.artists} sanatçı
                    </span>
                  )}
                </Link>
                <div className="p-3">
                  <Link href={`/admin/architects/${a.id}`} className="block min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-semibold text-zinc-100 tracking-tight truncate group-hover:text-white transition-colors">
                        {a.name}
                      </h3>
                      {a.status && a.status !== 'PUBLISHED' && (
                        <StatusPill status={a.status} compact />
                      )}
                    </div>
                    <div className="mt-1.5">
                      <span className={`inline-flex items-center ${TYPE_PILL_CLASSNAME}`}>
                        {TYPE_LABEL[a.type] || a.type}
                      </span>
                    </div>
                  </Link>
                  <div className="mt-2.5 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between gap-1">
                    <Link
                      href={`/admin/architects/${a.id}`}
                      className="text-[11px] text-zinc-300 hover:text-white transition-colors font-medium"
                    >
                      Düzenle
                    </Link>
                    <DeleteButton
                      endpoint={`/api/architects/${a.id}`}
                      confirmMessage={`"${a.name}" mimarını silmek istediğinizden emin misiniz?`}
                      entityName={a.name}
                      entityKind="Mimar"
                      onDeleted={reload}
                    />
                  </div>
                </div>
              </div>
            ))}
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
