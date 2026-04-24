'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Pagination from '@/components/admin/Pagination';
import DeleteButton from '@/components/admin/DeleteButton';
import { IconExternal } from '@/components/admin/Icons';

interface Artist {
  id: string;
  name: string;
  type: string;
  slug: string;
  image: string | null;
  genres: { genre: { nameTr: string } }[];
  _count: { albums: number; articles: number };
}

const PER_PAGE = 15;

const TYPE_LABEL: Record<string, string> = {
  SOLO: 'Solo',
  GROUP: 'Grup',
  COMPOSER: 'Besteci',
};

// Type renkleri kaldırıldı (editoryal tutarlılık — bkz. listening-paths).
// Tek ton: koyu yarı saydam + ince ring, uppercase tracking.
const TYPE_PILL_CLASSNAME =
  'absolute top-2 left-2 px-2 py-0.5 backdrop-blur-md bg-black/50 text-[10px] uppercase tracking-[0.15em] font-medium rounded-full ring-1 ring-inset ring-white/15 text-white/80';

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/artists?page=${page}&limit=${PER_PAGE}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setArtists(d.items || []);
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
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Sanatçılar</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            {total} sanatçı · {artists.reduce((s, a) => s + a._count.albums, 0)} albüm bu sayfada
          </p>
        </div>
        <Link
          href="/admin/artists/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-zinc-950 rounded-md text-xs font-semibold hover:bg-zinc-200 transition-colors"
        >
          + Yeni Sanatçı
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
      ) : artists.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/40 rounded-lg border border-zinc-800">
          <p className="text-sm text-zinc-100 font-medium">Henüz sanatçı eklenmedi</p>
          <p className="text-xs text-zinc-500 mt-1">Sağ üstten yeni bir sanatçı ekleyebilirsin</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {artists.map((a) => (
              <div
                key={a.id}
                className="group relative bg-zinc-900/40 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all overflow-hidden"
              >
                <Link
                  href={`/admin/artists/${a.id}`}
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
                    <div className="w-full h-full flex items-center justify-center text-zinc-700 text-5xl">
                      ♪
                    </div>
                  )}
                  {/* overlay bottom gradient */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  {/* type pill top-left — tek ton editoryal */}
                  <span className={TYPE_PILL_CLASSNAME}>
                    {TYPE_LABEL[a.type] || a.type}
                  </span>
                  {/* counts top-right */}
                  {(a._count.albums > 0 || a._count.articles > 0) && (
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      {a._count.albums > 0 && (
                        <span
                          className="px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-zinc-200 text-[10px] font-medium rounded ring-1 ring-white/10"
                          title="Albüm"
                        >
                          ♫ {a._count.albums}
                        </span>
                      )}
                      {a._count.articles > 0 && (
                        <span
                          className="px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-zinc-200 text-[10px] font-medium rounded ring-1 ring-white/10"
                          title="Makale"
                        >
                          ✎ {a._count.articles}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
                <div className="p-3">
                  <Link href={`/admin/artists/${a.id}`} className="block min-w-0">
                    <h3 className="text-[13px] font-semibold text-zinc-100 tracking-tight truncate group-hover:text-white transition-colors">
                      {a.name}
                    </h3>
                    {a.genres.length > 0 ? (
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {a.genres
                          .slice(0, 2)
                          .map((g) => g.genre.nameTr)
                          .join(' · ')}
                        {a.genres.length > 2 && (
                          <span className="text-zinc-600"> +{a.genres.length - 2}</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-[11px] text-zinc-600 truncate mt-0.5 font-mono">
                        /{a.slug}
                      </p>
                    )}
                  </Link>
                  <div className="mt-2.5 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between gap-1">
                    <Link
                      href={`/admin/artists/${a.id}`}
                      className="text-[11px] text-zinc-300 hover:text-white transition-colors font-medium"
                    >
                      Düzenle
                    </Link>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/tr/artist/${a.slug}`}
                        target="_blank"
                        className="text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 w-6 h-6 rounded flex items-center justify-center transition-colors"
                        aria-label="Sitede aç"
                        title="Sitede aç"
                      >
                        <IconExternal size={12} />
                      </Link>
                      <DeleteButton
                        endpoint={`/api/artists/${a.id}`}
                        confirmMessage={`"${a.name}" sanatçısını silmek istediğinizden emin misiniz?`}
                        entityName={a.name}
                        entityKind="Sanatçı"
                        onDeleted={reload}
                      />
                    </div>
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
