'use client';

/**
 * Üst Başlık (Topic) liste sayfası. Makale gruplaması için kullanıcı
 * tarafından oluşturulan başlıklar burada listelenir. Genre listesinden
 * farklı: hiyerarşi yok, hepsi düz; bu yüzden basit bir grid kart yapısı
 * kullanıyoruz.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import DeleteButton from '@/components/admin/DeleteButton';
import { IconExternal, IconPlus } from '@/components/admin/Icons';
import { Skeleton } from '@/components/admin/Loading';
import { useClientLocale } from '@/components/admin/useClientLocale';
import { useSearchShortcut } from '@/components/admin/useSearchShortcut';
import StatusPill from '@/components/admin/StatusPill';

interface Topic {
  id: string;
  slug: string;
  nameTr: string;
  nameEn: string;
  image: string | null;
  order: number;
  status: string;
  _count: { articles: number };
}

export default function TopicsPage() {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const locale = useClientLocale();

  useSearchShortcut(searchRef, { onClear: () => setQuery('') });

  const { data: topics = [], mutate, isLoading, error } = useSWR<Topic[]>('/api/topics?all=true');

  const reload = useCallback(() => {
    mutate();
  }, [mutate]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return topics;
    return topics.filter(
      (t) => t.nameTr.toLowerCase().includes(q) || t.nameEn.toLowerCase().includes(q),
    );
  }, [topics, q]);

  const hasResults = filtered.length > 0;

  return (
    <div>
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Üst Başlıklar</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            {topics.length} başlık · makaleleri gruplayan üst kategori
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Başlık ara…"
              aria-label="Üst başlık ara"
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
            href="/admin/topics/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-zinc-950 rounded-md text-xs font-semibold hover:bg-zinc-200 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40"
          >
            <IconPlus size={12} />
            Yeni Üst Başlık
          </Link>
        </div>
      </div>

      {isLoading ? (
        <GridSkeleton />
      ) : error ? (
        <div className="bg-zinc-900/60 rounded-lg border border-zinc-800 border-l-2 border-l-rose-400 p-10 text-center">
          <p className="text-xs text-zinc-200 mb-2">Veriler yüklenemedi: {error.message}</p>
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
            {q ? `"${query}" için sonuç yok` : 'Henüz üst başlık eklenmedi'}
          </p>
          {!q && (
            <p className="text-[11px] text-zinc-600">
              Örnek: &quot;Soundtracks&quot;, &quot;Arşiv&quot; gibi konular oluştur, makaleleri altına ekle.
            </p>
          )}
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
          {filtered.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              locale={locale}
              onDeleted={reload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicCard({
  topic,
  locale,
  onDeleted,
}: {
  topic: Topic;
  locale: 'tr' | 'en';
  onDeleted: () => void;
}) {
  return (
    <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 hover:border-zinc-700 overflow-hidden transition-colors self-start">
      <div className="group flex items-start gap-3 p-3 hover:bg-zinc-800/30 transition-colors">
        {topic.image ? (
          <img
            src={topic.image}
            alt={topic.nameTr}
            loading="lazy"
            className="w-14 h-14 rounded-md object-cover flex-shrink-0 ring-1 ring-zinc-800"
          />
        ) : (
          <div className="w-14 h-14 rounded-md bg-zinc-800 ring-1 ring-zinc-700/60 flex items-center justify-center text-zinc-500 text-xl flex-shrink-0">
            #
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-medium text-zinc-100 truncate">{topic.nameTr}</span>
            <span className="text-[10px] text-zinc-500 truncate">{topic.nameEn}</span>
            {topic.status && topic.status !== 'PUBLISHED' && (
              <StatusPill status={topic.status} compact />
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {topic._count.articles} makale · sıra {topic.order}
          </p>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 md:transition-opacity">
          <Link
            href={`/${locale}/article?topic=${topic.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-zinc-100 w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40 transition-colors"
            aria-label="Sitede aç"
            title="Sitede aç"
          >
            <IconExternal size={13} />
          </Link>
          <Link
            href={`/admin/topics/${topic.id}`}
            className="text-zinc-300 hover:text-white hover:bg-zinc-800 px-2.5 py-1 rounded-md text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40 transition-colors"
          >
            Düzenle
          </Link>
          <DeleteButton
            endpoint={`/api/topics/${topic.id}`}
            confirmMessage={`"${topic.nameTr}" üst başlığını silmek istediğinizden emin misiniz?`}
            onDeleted={onDeleted}
            entityName={topic.nameTr}
            entityKind="Üst Başlık"
          />
        </div>
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
          </div>
        </div>
      ))}
    </div>
  );
}
