'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Pagination from '@/components/admin/Pagination';
import DeleteButton from '@/components/admin/DeleteButton';

interface Architect {
  id: string;
  name: string;
  type: string;
  slug: string;
  image: string | null;
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

const TYPE_PILL: Record<string, string> = {
  PRODUCER: 'bg-violet-500/10 text-violet-300 ring-violet-500/20',
  STUDIO: 'bg-teal-500/10 text-teal-300 ring-teal-500/20',
  MANAGER: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
  ARRANGER: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
  RECORD_LABEL: 'bg-rose-500/10 text-rose-300 ring-rose-500/20',
};

export default function ArchitectsPage() {
  const [items, setItems] = useState<Architect[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/architects?page=${page}&limit=${PER_PAGE}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setItems(d.items || []);
        setTotal(d.total || 0);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, reloadToken]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadToken((t) => t + 1);
  }, []);

  const goToPage = useCallback((p: number) => {
    setLoading(true);
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
      {loading ? (
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
                      loading="lazy"
                      decoding="async"
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
                    <h3 className="text-[13px] font-semibold text-zinc-100 tracking-tight truncate group-hover:text-white transition-colors">
                      {a.name}
                    </h3>
                    <div className="mt-1.5">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset ${
                          TYPE_PILL[a.type] || 'bg-zinc-800 text-zinc-300 ring-zinc-700'
                        }`}
                      >
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
