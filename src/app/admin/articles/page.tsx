'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Pagination from '@/components/admin/Pagination';
import DeleteButton from '@/components/admin/DeleteButton';
import { getArticleCategory } from '@/lib/article-categories';
import { IconExternal } from '@/components/admin/Icons';
import { TableSkeleton } from '@/components/admin/Loading';
import BulkActionBar, { BulkCheckbox } from '@/components/admin/BulkActionBar';
import { useBulkSelection } from '@/lib/bulk-selection';

interface Article {
  id: string;
  slug: string;
  titleTr: string;
  category: string;
  status: string;
  createdAt: string;
  publishedAt: string | null;
  author: { name: string };
}
const PER_PAGE = 15;

const FILTERS = [
  { v: '', l: 'Tümü' },
  { v: 'PUBLISHED', l: 'Yayında' },
  { v: 'SCHEDULED', l: 'Zamanlanmış' },
  { v: 'PENDING_REVIEW', l: 'Onayda' },
  { v: 'DRAFT', l: 'Taslak' },
];

/**
 * Visual treatment for each status, kept in a single map so the list row,
 * dashboard badge, and the form status select can stay consistent.
 */
// Status pill'leri minimal renk vurgusu — pill'in kendisi nötr zinc,
// yalnızca dot (◉) işlevsel durumun rengini taşır. Büyük renkli blok
// yok; okunaklı, profesyonel editoryal sinyal. "Yayında" için yeşil
// dot, "Zamanlanmış" için mavi, "Onayda" için amber, "Taslak" için
// nötr — renk burada kategori değil anlam taşıyor.
const STATUS_PILL_BASE =
  'bg-zinc-900/60 text-zinc-200 border-zinc-800';
const STATUS_STYLE: Record<string, { label: string; pill: string; dot: string }> = {
  PUBLISHED: { label: 'Yayında', pill: STATUS_PILL_BASE, dot: 'bg-emerald-400' },
  SCHEDULED: { label: 'Zamanlanmış', pill: STATUS_PILL_BASE, dot: 'bg-sky-400' },
  PENDING_REVIEW: { label: 'Onayda', pill: STATUS_PILL_BASE, dot: 'bg-amber-400' },
  DRAFT: { label: 'Taslak', pill: STATUS_PILL_BASE, dot: 'bg-zinc-500' },
};

const ALLOWED_FILTERS = new Set(['', 'PUBLISHED', 'SCHEDULED', 'PENDING_REVIEW', 'DRAFT']);

export default function ArticlesPage() {
  // useSearchParams() içerdiği için Next.js statik pre-render'da bailout
  // istiyor — Suspense boundary ile sarıyoruz.
  return (
    <Suspense fallback={<TableSkeleton rows={PER_PAGE} />}>
      <ArticlesPageInner />
    </Suspense>
  );
}

function ArticlesPageInner() {
  const searchParams = useSearchParams();
  // Honour ?status=SCHEDULED etc. coming from the dashboard, but only on
  // first render — after that the in-page tab buttons take over so the URL
  // doesn't fight with user clicks.
  const initialFilter = (() => {
    const raw = searchParams?.get('status') ?? '';
    return ALLOWED_FILTERS.has(raw) ? raw : '';
  })();
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialFilter);
  const [reloadToken, setReloadToken] = useState(0);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkErr, setBulkErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
    if (filter) params.set('status', filter);
    fetch(`/api/articles?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setArticles(d.items || []);
        setTotal(d.total || 0);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, filter, reloadToken]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadToken((t) => t + 1);
  }, []);

  const goToPage = useCallback((p: number) => {
    setLoading(true);
    setPage(p);
  }, []);

  const applyFilter = useCallback((v: string) => {
    setLoading(true);
    setFilter(v);
    setPage(1);
  }, []);

  // Bulk selection is scoped to the current page's IDs so hopping between
  // filters / pages doesn't silently carry selections forward.
  const pageIds = useMemo(() => articles.map((a) => a.id), [articles]);
  const sel = useBulkSelection(pageIds);

  const onBulkCleared = useCallback(() => {
    sel.clear();
    reload();
  }, [sel, reload]);

  async function changeStatus(next: 'PUBLISHED' | 'DRAFT') {
    if (sel.count === 0 || bulkBusy) return;
    const verb = next === 'PUBLISHED' ? 'yayına alınacak' : 'taslağa çekilecek';
    if (!window.confirm(`${sel.count} makale ${verb}. Devam edilsin mi?`)) return;
    setBulkBusy(true);
    setBulkErr(null);
    try {
      const res = await fetch('/api/articles/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: sel.ids, status: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'İşlem başarısız');
      }
      sel.clear();
      reload();
    } catch (e) {
      setBulkErr(e instanceof Error ? e.message : 'İşlem başarısız');
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Makaleler</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">{total} makale</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Plain <a> intentional: the target is an API route returning a CSV file. */}
          <a
            href={`/api/admin/export/articles${filter ? `?status=${filter}` : ''}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            title="Geçerli filtrelere göre CSV olarak indir"
          >
            CSV indir
          </a>
          <Link
            href="/admin/articles/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-zinc-950 rounded-md text-xs font-semibold hover:bg-zinc-200 transition-colors"
          >
            + Yeni Makale
          </Link>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => applyFilter(f.v)}
            className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
              filter === f.v
                ? 'bg-white text-zinc-950 border-white'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      <BulkActionBar
        count={sel.count}
        itemLabel="makale"
        endpoint="/api/articles/bulk-delete"
        ids={sel.ids}
        onCleared={onBulkCleared}
        extra={
          <>
            <button
              type="button"
              onClick={() => changeStatus('PUBLISHED')}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-wait transition-colors"
            >
              Yayına Al
            </button>
            <button
              type="button"
              onClick={() => changeStatus('DRAFT')}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-900/40 text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 disabled:opacity-50 disabled:cursor-wait transition-colors"
            >
              Taslağa Çek
            </button>
          </>
        }
      />
      {bulkErr && (
        <div className="mb-3 px-3 py-2 rounded-md border border-zinc-800 bg-zinc-900/40 text-[11px] text-zinc-300">
          {bulkErr}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={PER_PAGE} />
      ) : (
        <>
          <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-900/80 border-b border-zinc-800">
                  <th className="w-10 px-3 py-2.5">
                    <BulkCheckbox
                      checked={sel.allSelected}
                      indeterminate={sel.someSelected}
                      onChange={() => sel.toggleAllOnPage(pageIds)}
                      ariaLabel="Sayfadaki tüm makaleleri seç"
                    />
                  </th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-zinc-500">Başlık</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-zinc-500">Kategori</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-zinc-500 w-32">Durum</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-zinc-500">Yazar</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-zinc-500 w-36">Tarih</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-zinc-500 w-40">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {articles.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 text-xs">
                      Henüz makale yok.
                    </td>
                  </tr>
                )}
                {articles.map((a) => {
                  const cat = getArticleCategory(a.category);
                  const style = STATUS_STYLE[a.status] ?? STATUS_STYLE.DRAFT;
                  // Scheduled rows show the future publish time; published/draft
                  // fall back to createdAt so the column is always populated.
                  const isScheduled = a.status === 'SCHEDULED' && a.publishedAt;
                  const dateLabel = isScheduled
                    ? new Date(a.publishedAt!).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : new Date(a.createdAt).toLocaleDateString('tr-TR');
                  const isChecked = sel.isSelected(a.id);
                  return (
                    <tr
                      key={a.id}
                      className={`transition-colors ${isChecked ? 'bg-zinc-800/40 hover:bg-zinc-800/60' : 'hover:bg-zinc-800/30'}`}
                    >
                      <td className="px-3 py-2">
                        <BulkCheckbox
                          checked={isChecked}
                          onChange={() => sel.toggle(a.id)}
                          ariaLabel={`${a.titleTr} seç`}
                        />
                      </td>
                      <td className="px-4 py-2 font-medium text-zinc-100 max-w-[280px] truncate">
                        {a.titleTr}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${cat.pill}`}
                        >
                          {cat.labelTr}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-[0.1em] border ${style.pill}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-zinc-400">{a.author.name}</td>
                      <td className="px-4 py-2 text-zinc-500 font-mono text-[11px]" title={isScheduled ? 'Planlanan yayın tarihi' : 'Oluşturulma tarihi'}>
                        {isScheduled && <span className="text-sky-400 mr-1">◷</span>}
                        {dateLabel}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {a.status === 'PUBLISHED' && (
                            <Link
                              href={`/tr/article/${a.slug}`}
                              target="_blank"
                              className="text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                              aria-label="Sitede aç"
                              title="Sitede aç"
                            >
                              <IconExternal size={13} />
                            </Link>
                          )}
                          <Link
                            href={`/admin/articles/${a.id}`}
                            className="text-zinc-300 hover:text-white hover:bg-zinc-800 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
                          >
                            Düzenle
                          </Link>
                          <DeleteButton
                            endpoint={`/api/articles/${a.id}`}
                            confirmMessage={`"${a.titleTr}" makalesini silmek istediğinizden emin misiniz?`}
                            onDeleted={reload}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
