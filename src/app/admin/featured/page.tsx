'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { IconArticle, IconAlbum } from '@/components/admin/Icons';
import { TableSkeleton } from '@/components/admin/Loading';

type Kind = 'article' | 'album';

interface ArticleHit {
  id: string;
  titleTr: string;
  category: string;
  featuredImage: string | null;
  status: string;
  featuredOrder: number | null;
}

interface AlbumHit {
  id: string;
  title: string;
  coverImage: string | null;
  artist: { name: string };
  featuredOrder: number | null;
}

type Item =
  | ({ kind: 'article' } & ArticleHit)
  | ({ kind: 'album' } & AlbumHit);

const TABS: { kind: Kind; label: string; Icon: typeof IconArticle }[] = [
  { kind: 'article', label: 'Makaleler', Icon: IconArticle },
  { kind: 'album', label: 'Albümler', Icon: IconAlbum },
];

/**
 * Featured items curation page. Two tabs (Makaleler / Albümler), each with
 * a left "currently featured" list (drag-and-drop reorderable, with X
 * buttons to remove) and a right "search to add" panel. Hitting Save
 * sends the whole ordered ID list to PUT /api/admin/featured.
 *
 * We keep separate state per tab so switching tabs doesn't lose unsaved
 * changes (and we warn before unmounting if dirty).
 */
export default function FeaturedPage() {
  const [tab, setTab] = useState<Kind>('article');
  const [max, setMax] = useState(12);
  const [articleItems, setArticleItems] = useState<Item[]>([]);
  const [albumItems, setAlbumItems] = useState<Item[]>([]);
  const [articleDirty, setArticleDirty] = useState(false);
  const [albumDirty, setAlbumDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = tab === 'article' ? articleItems : albumItems;
  const setItems = tab === 'article' ? setArticleItems : setAlbumItems;
  const dirty = tab === 'article' ? articleDirty : albumDirty;
  const setDirty = tab === 'article' ? setArticleDirty : setAlbumDirty;

  // Initial fetch — both kinds at once so switching tabs is instant.
  const { data: featuredData, isLoading } = useSWR<{
    max?: number;
    articles: ArticleHit[];
    albums: AlbumHit[];
  }>('/api/admin/featured');

  useEffect(() => {
    if (!featuredData) return;
    setMax(featuredData.max ?? 12);
    setArticleItems(
      (featuredData.articles as ArticleHit[]).map((a) => ({ kind: 'article' as const, ...a })),
    );
    setAlbumItems(
      (featuredData.albums as AlbumHit[]).map((a) => ({ kind: 'album' as const, ...a })),
    );
  }, [featuredData]);

  // Warn before navigating away with unsaved changes.
  useEffect(() => {
    if (!articleDirty && !albumDirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [articleDirty, albumDirty]);

  const reorder = useCallback(
    (from: number, to: number) => {
      setItems((prev) => {
        if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) {
          return prev;
        }
        const next = prev.slice();
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
      setDirty(true);
    },
    [setItems, setDirty],
  );

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((it) => it.id !== id));
      setDirty(true);
    },
    [setItems, setDirty],
  );

  const add = useCallback(
    (item: Item) => {
      setItems((prev) => {
        if (prev.some((p) => p.id === item.id)) return prev;
        if (prev.length >= max) return prev;
        return [...prev, item];
      });
      setDirty(true);
    },
    [setItems, setDirty, max],
  );

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/featured', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: tab, ids: items.map((i) => i.id) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || 'Kaydedilemedi');
      }
      setDirty(false);
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Öne Çıkarılanlar</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Anasayfada hangi içeriklerin görüneceğini sırala. En fazla {max} öğe.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && !dirty && (
            <span className="text-[11px] text-emerald-300/90 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-400" /> Kaydedildi
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              dirty && !saving
                ? 'bg-white text-zinc-950 hover:bg-zinc-200'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {saving ? 'Kaydediliyor…' : dirty ? 'Sıralamayı Kaydet' : 'Kaydedildi'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
          {error}
        </div>
      )}

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {TABS.map((t) => {
          const isActive = tab === t.kind;
          const dirtyHere =
            t.kind === 'article' ? articleDirty : albumDirty;
          return (
            <button
              key={t.kind}
              type="button"
              onClick={() => setTab(t.kind)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium border transition-colors ${
                isActive
                  ? 'bg-white text-zinc-950 border-white'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
            >
              <t.Icon size={13} />
              {t.label}
              {dirtyHere && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-amber-400"
                  title="Kaydedilmemiş değişiklik var"
                />
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <FeaturedList
              items={items}
              max={max}
              onReorder={reorder}
              onRemove={remove}
            />
          </div>
          <div className="lg:col-span-2">
            <PickerPanel
              kind={tab}
              chosenIds={new Set(items.map((i) => i.id))}
              full={items.length >= max}
              onAdd={add}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Drag-and-drop reorderable list of featured items, with explicit ↑/↓
 * buttons for keyboard users (and as a fallback on touch). We use native
 * HTML5 DnD instead of a library — the list is small (≤12) so we don't
 * need anything fancier.
 */
function FeaturedList({
  items,
  max,
  onReorder,
  onRemove,
}: {
  items: Item[];
  max: number;
  onReorder: (from: number, to: number) => void;
  onRemove: (id: string) => void;
}) {
  const dragIdx = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-lg p-10 text-center">
        <p className="text-sm text-zinc-300 font-medium">Henüz öne çıkarılan öğe yok</p>
        <p className="text-[12px] text-zinc-500 mt-1">
          Sağdaki listeden ekle, sonra sürükle-bırak ile sırala.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
          Sıralı Liste
        </p>
        <p className="text-[11px] text-zinc-500 font-mono">
          {items.length}/{max}
        </p>
      </div>
      <ul>
        {items.map((it, i) => {
          const isOver = overIdx === i;
          const title = it.kind === 'article' ? it.titleTr : it.title;
          const sub =
            it.kind === 'article'
              ? `Makale · ${it.category.replace(/_/g, ' ').toLowerCase()} · ${
                  it.status === 'PUBLISHED'
                    ? 'yayında'
                    : it.status === 'SCHEDULED'
                    ? 'zamanlanmış'
                    : 'taslak'
                }`
              : `Albüm · ${it.artist.name}`;
          const img = it.kind === 'article' ? it.featuredImage : it.coverImage;
          return (
            <li
              key={it.id}
              draggable
              onDragStart={(e) => {
                dragIdx.current = i;
                e.dataTransfer.effectAllowed = 'move';
                // Firefox needs setData to actually start a drag.
                e.dataTransfer.setData('text/plain', String(i));
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (overIdx !== i) setOverIdx(i);
              }}
              onDragLeave={() => {
                if (overIdx === i) setOverIdx(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = dragIdx.current;
                if (from !== null && from !== i) onReorder(from, i);
                dragIdx.current = null;
                setOverIdx(null);
              }}
              onDragEnd={() => {
                dragIdx.current = null;
                setOverIdx(null);
              }}
              className={`group flex items-center gap-3 px-3 py-2.5 border-b border-zinc-800/60 last:border-b-0 transition-colors ${
                isOver ? 'bg-sky-500/10' : 'hover:bg-zinc-800/30'
              }`}
            >
              {/* drag handle */}
              <span
                className="text-zinc-600 cursor-grab active:cursor-grabbing select-none flex-shrink-0"
                aria-hidden="true"
                title="Sürükle"
              >
                <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
                  <circle cx="3" cy="2" r="1.2" />
                  <circle cx="9" cy="2" r="1.2" />
                  <circle cx="3" cy="7" r="1.2" />
                  <circle cx="9" cy="7" r="1.2" />
                  <circle cx="3" cy="12" r="1.2" />
                  <circle cx="9" cy="12" r="1.2" />
                </svg>
              </span>
              <span className="font-mono text-[11px] text-zinc-500 w-5 text-right tabular-nums flex-shrink-0">
                {i + 1}
              </span>
              {img ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={img}
                  alt=""
                  className="w-9 h-9 rounded-md object-cover flex-shrink-0 ring-1 ring-zinc-800"
                />
              ) : (
                <span className="w-9 h-9 rounded-md bg-zinc-800 text-zinc-500 flex items-center justify-center flex-shrink-0">
                  {it.kind === 'article' ? <IconArticle size={14} /> : <IconAlbum size={14} />}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-zinc-100 font-medium truncate">{title}</p>
                <p className="text-[11px] text-zinc-500 truncate">{sub}</p>
              </div>
              <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => onReorder(i, Math.max(0, i - 1))}
                  disabled={i === 0}
                  title="Yukarı al"
                  aria-label="Yukarı al"
                  className="w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center justify-center"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onReorder(i, Math.min(items.length - 1, i + 1))}
                  disabled={i === items.length - 1}
                  title="Aşağı al"
                  aria-label="Aşağı al"
                  className="w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center justify-center"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(it.id)}
                  title="Listeden çıkar"
                  aria-label="Listeden çıkar"
                  className="w-7 h-7 rounded-md text-zinc-500 hover:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Right-hand panel: search box + scrollable list of candidates. Items
 * already in the featured list are shown disabled (grey + "eklendi"
 * badge) so the editor sees what's already chosen without having to
 * mentally diff lists.
 */
function PickerPanel({
  kind,
  chosenIds,
  full,
  onAdd,
}: {
  kind: Kind;
  chosenIds: Set<string>;
  full: boolean;
  onAdd: (it: Item) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  // Reset query when switching tabs.
  useEffect(() => {
    setQ('');
  }, [kind]);

  // Debounced fetch.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ kind });
        if (q.trim()) params.set('q', q.trim());
        const res = await fetch(`/api/admin/featured/pool?${params}`);
        const d = await res.json();
        if (cancelled) return;
        const list = (Array.isArray(d.results) ? d.results : []) as
          | ArticleHit[]
          | AlbumHit[];
        setResults(list.map((r) => ({ kind, ...r } as Item)));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, kind]);

  const heading = useMemo(() => (kind === 'article' ? 'Makale Ekle' : 'Albüm Ekle'), [kind]);

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg overflow-hidden flex flex-col">
      <div className="px-4 py-2.5 border-b border-zinc-800">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">
          {heading}
        </p>
        <div className="flex items-center gap-2 bg-zinc-950/60 border border-zinc-800 rounded-md px-2.5 py-1.5">
          <span className="text-zinc-500" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={kind === 'article' ? 'Başlığa göre ara…' : 'Albüm veya sanatçı adı…'}
            className="bg-transparent outline-none text-[12px] text-zinc-100 placeholder:text-zinc-500 flex-1 min-w-0"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="text-zinc-500 hover:text-zinc-200 text-[12px] flex-shrink-0"
              aria-label="Temizle"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <ul className="max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {loading && (
          <li className="px-4 py-6 text-center text-[12px] text-zinc-500">Yükleniyor…</li>
        )}
        {!loading && results.length === 0 && (
          <li className="px-4 py-6 text-center text-[12px] text-zinc-500">Sonuç yok</li>
        )}
        {!loading &&
          results.map((it) => {
            const chosen = chosenIds.has(it.id);
            const title = it.kind === 'article' ? it.titleTr : it.title;
            const sub =
              it.kind === 'article'
                ? `${it.category.replace(/_/g, ' ').toLowerCase()} · ${
                    it.status === 'PUBLISHED'
                      ? 'yayında'
                      : it.status === 'SCHEDULED'
                      ? 'zamanlanmış'
                      : 'taslak'
                  }`
                : it.artist.name;
            const img = it.kind === 'article' ? it.featuredImage : it.coverImage;
            const disabled = chosen || (full && !chosen);
            return (
              <li
                key={it.id}
                className={`flex items-center gap-2.5 px-3 py-2 border-b border-zinc-800/60 last:border-b-0 ${
                  chosen ? 'opacity-50' : 'hover:bg-zinc-800/30'
                }`}
              >
                {img ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={img}
                    alt=""
                    className="w-8 h-8 rounded object-cover flex-shrink-0 ring-1 ring-zinc-800"
                  />
                ) : (
                  <span className="w-8 h-8 rounded bg-zinc-800 text-zinc-500 flex items-center justify-center flex-shrink-0">
                    {it.kind === 'article' ? <IconArticle size={13} /> : <IconAlbum size={13} />}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-zinc-100 font-medium truncate">{title}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{sub}</p>
                </div>
                {chosen ? (
                  <span className="text-[10px] text-emerald-300/80 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 font-medium flex-shrink-0">
                    eklendi
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAdd(it)}
                    disabled={disabled}
                    className="text-[11px] font-semibold px-2 py-1 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    title={full ? 'Liste dolu' : 'Listeye ekle'}
                  >
                    +
                  </button>
                )}
              </li>
            );
          })}
      </ul>
    </div>
  );
}
