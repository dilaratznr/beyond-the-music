'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import DeleteButton from '@/components/admin/DeleteButton';
import { IconChevronDown, IconExternal, IconPlus } from '@/components/admin/Icons';
import { Skeleton } from '@/components/admin/Loading';
import { useClientLocale } from '@/components/admin/useClientLocale';
import { useSearchShortcut } from '@/components/admin/useSearchShortcut';
import StatusPill from '@/components/admin/StatusPill';

interface Genre {
  id: string;
  slug: string;
  nameTr: string;
  nameEn: string;
  image: string | null;
  parentId: string | null;
  status: string;
  _count: { artists: number; articles: number };
}

export default function GenresPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const locale = useClientLocale();

  useSearchShortcut(searchRef, { onClear: () => setQuery('') });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/genres?all=true')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        setGenres(Array.isArray(d) ? d : d.items || []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Yükleme başarısız');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadToken((t) => t + 1);
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  }, []);

  const { groups, orphans, totalMain, totalSub } = useMemo(() => {
    const mainGenres = genres.filter((g) => !g.parentId);
    const byParent = new Map<string, Genre[]>();
    genres
      .filter((g) => g.parentId)
      .forEach((s) => {
        const arr = byParent.get(s.parentId as string) ?? [];
        arr.push(s);
        byParent.set(s.parentId as string, arr);
      });
    const mainIds = new Set(mainGenres.map((m) => m.id));
    const orphanSubs = genres.filter((g) => g.parentId && !mainIds.has(g.parentId));
    const _groups = mainGenres.map((m) => ({ main: m, subs: byParent.get(m.id) ?? [] }));
    return {
      groups: _groups,
      orphans: orphanSubs,
      totalMain: mainGenres.length,
      totalSub: genres.length - mainGenres.length,
    };
  }, [genres]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return { groups, orphans };
    const matches = (g: Genre) =>
      g.nameTr.toLowerCase().includes(q) || g.nameEn.toLowerCase().includes(q);
    const fGroups = groups
      .map((grp) => ({
        main: grp.main,
        subs: grp.subs.filter((s) => matches(s)),
        matchesMain: matches(grp.main),
      }))
      .filter((grp) => grp.matchesMain || grp.subs.length > 0)
      .map(({ main, subs }) => ({ main, subs }));
    const fOrphans = orphans.filter((o) => matches(o));
    return { groups: fGroups, orphans: fOrphans };
  }, [groups, orphans, q]);

  const hasResults = filtered.groups.length > 0 || filtered.orphans.length > 0;
  const searching = q.length > 0;

  return (
    <div>
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Türler</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            {genres.length} tür · {totalMain} ana · {totalSub} alt
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tür ara…"
              aria-label="Tür ara"
              className="pl-3 pr-10 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-xs text-zinc-100 placeholder:text-zinc-500 outline-none hover:border-zinc-600 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 w-48 transition-colors"
            />
            <kbd
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 leading-none pointer-events-none hidden sm:inline"
              aria-hidden="true"
            >
              /
            </kbd>
          </div>
          <Link
            href="/admin/genres/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-zinc-950 rounded-md text-xs font-semibold hover:bg-zinc-200 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40"
          >
            <IconPlus size={12} />
            Yeni Tür
          </Link>
        </div>
      </div>

      {loading ? (
        <GridSkeleton />
      ) : error ? (
        <div className="bg-red-500/5 rounded-lg border border-red-500/20 p-10 text-center">
          <p className="text-xs text-red-300 mb-2">Veriler yüklenemedi: {error}</p>
          <button
            type="button"
            onClick={reload}
            className="text-xs text-zinc-300 hover:text-white underline"
          >
            Tekrar dene
          </button>
        </div>
      ) : !hasResults ? (
        <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 p-10 text-center">
          <p className="text-xs text-zinc-500 mb-2">
            {q ? `"${query}" için sonuç yok` : 'Henüz tür eklenmedi'}
          </p>
          {q && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs text-zinc-300 hover:text-white underline"
            >
              Aramayı temizle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
          {filtered.groups.map(({ main, subs }) => {
            const isOpen = searching ? subs.length > 0 : expanded === main.id;
            const hasSubs = subs.length > 0;
            return (
              <GenreCard
                key={main.id}
                main={main}
                subs={subs}
                isOpen={isOpen}
                hasSubs={hasSubs}
                locale={locale}
                onToggle={() => hasSubs && toggleExpand(main.id)}
                onDeleted={reload}
              />
            );
          })}

          {filtered.orphans.length > 0 && (
            <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden col-span-full">
              <div className="px-4 py-2 bg-zinc-900/60 border-b border-zinc-800 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Üst türü atanmamış alt türler ({filtered.orphans.length})
                </p>
              </div>
              <div className="divide-y divide-zinc-800/60">
                {filtered.orphans.map((s) => (
                  <SubRow key={s.id} sub={s} locale={locale} onDeleted={reload} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GenreCard({
  main,
  subs,
  isOpen,
  hasSubs,
  locale,
  onToggle,
  onDeleted,
}: {
  main: Genre;
  subs: Genre[];
  isOpen: boolean;
  hasSubs: boolean;
  locale: 'tr' | 'en';
  onToggle: () => void;
  onDeleted: () => void;
}) {
  return (
    <div
      // Önceden `col-span-full` ile açılan kart tüm grid row'unu kaplıyordu,
      // diğer kartlar alt satıra atlıyordu — alt türlere tıklayınca grid'in
      // alta kayması rahatsız ediciydi. Artık kart kendi sütununda yerinde
      // uzuyor; akordiyon davranışı, grid bozulmuyor.
      className={`bg-zinc-900/40 rounded-lg border overflow-hidden transition-colors self-start ${
        isOpen ? 'border-zinc-700' : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="group flex items-start gap-3 p-3 hover:bg-zinc-800/30 transition-colors">
        {main.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={main.image}
            alt={main.nameTr}
            loading="lazy"
            className="w-14 h-14 rounded-md object-cover flex-shrink-0 ring-1 ring-zinc-800"
          />
        ) : (
          <div className="w-14 h-14 rounded-md bg-zinc-800 ring-1 ring-zinc-700/60 flex items-center justify-center text-zinc-500 text-xl flex-shrink-0">
            ♫
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-medium text-zinc-100 truncate">{main.nameTr}</span>
            <span className="text-[10px] text-zinc-500 truncate">{main.nameEn}</span>
            {main.status && main.status !== 'PUBLISHED' && (
              <StatusPill status={main.status} compact />
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>{main._count.artists} sanatçı</span>
            <span className="text-zinc-700">·</span>
            <span>{main._count.articles} makale</span>
          </p>
          {hasSubs && (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={isOpen}
              aria-label={isOpen ? 'Alt türleri daralt' : 'Alt türleri genişlet'}
              className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40"
            >
              <span
                className={`inline-flex transition-transform ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              >
                <IconChevronDown size={10} />
              </span>
              {subs.length} alt tür
            </button>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 md:transition-opacity">
          <Link
            href={`/${locale}/genre/${main.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-zinc-100 w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40 transition-colors"
            aria-label="Sitede aç"
            title="Sitede aç"
          >
            <IconExternal size={13} />
          </Link>
          <Link
            href={`/admin/genres/${main.id}`}
            className="text-zinc-300 hover:text-white hover:bg-zinc-800 px-2.5 py-1 rounded-md text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40 transition-colors"
          >
            Düzenle
          </Link>
          <DeleteButton
            endpoint={`/api/genres/${main.id}`}
            confirmMessage={`"${main.nameTr}" türünü silmek istediğinizden emin misiniz?`}
            onDeleted={onDeleted}
          />
        </div>
      </div>

      {hasSubs && isOpen && (
        // Kart tek sütunda uzuyor — alt türleri de dikey liste olarak
        // göster. Önceden yatay grid'di ama kart dar olunca sıkışıktı.
        <div className="border-t border-zinc-800 bg-zinc-950/50 p-2 space-y-0.5">
          {subs.map((s) => (
            <SubRow key={s.id} sub={s} locale={locale} onDeleted={onDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubRow({
  sub,
  locale,
  onDeleted,
}: {
  sub: Genre;
  locale: 'tr' | 'en';
  onDeleted: () => void;
}) {
  return (
    <div className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-800/50 transition-colors">
      {sub.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sub.image}
          alt={sub.nameTr}
          loading="lazy"
          className="w-9 h-9 rounded-md object-cover flex-shrink-0 ring-1 ring-zinc-800"
        />
      ) : (
        <div className="w-9 h-9 rounded-md bg-zinc-800 ring-1 ring-zinc-700/60 flex items-center justify-center text-zinc-500 text-xs flex-shrink-0">
          ♪
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-[12px] font-medium text-zinc-200 truncate">{sub.nameTr}</div>
          {sub.status && sub.status !== 'PUBLISHED' && (
            <StatusPill status={sub.status} compact />
          )}
        </div>
        <div className="text-[10px] text-zinc-500 truncate">
          {sub.nameEn} · {sub._count.artists} san · {sub._count.articles} mak
        </div>
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 md:transition-opacity">
        <Link
          href={`/${locale}/genre/${sub.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 hover:text-zinc-100 w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40 transition-colors"
          aria-label="Sitede aç"
          title="Sitede aç"
        >
          <IconExternal size={12} />
        </Link>
        <Link
          href={`/admin/genres/${sub.id}`}
          className="text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 py-0.5 rounded text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40 transition-colors"
        >
          Düzenle
        </Link>
        <DeleteButton
          endpoint={`/api/genres/${sub.id}`}
          confirmMessage={`"${sub.nameTr}" türünü silmek istediğinizden emin misiniz?`}
          onDeleted={onDeleted}
        />
      </div>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-zinc-900/40 rounded-lg border border-zinc-800 p-3 flex items-start gap-3"
        >
          <Skeleton className="w-14 h-14 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2 w-1/2" />
            <Skeleton className="h-5 w-16 rounded mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}
