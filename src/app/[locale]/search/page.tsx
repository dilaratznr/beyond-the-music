'use client';

import { useSearchParams, useParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';

interface Result { type: string; slug: string; title: string; image: string | null; sub: string; }

const TYPE_LINKS: Record<string, string> = {
  genre: 'genre', artist: 'artist', album: 'artist',
  architect: 'architects', article: 'article', 'listening-path': 'listening-paths',
};

const TYPE_LABELS_TR: Record<string, string> = {
  genre: 'Tür', artist: 'Sanatçı', album: 'Albüm',
  architect: 'Mimar', article: 'Makale', 'listening-path': 'Rota',
};

const TYPE_LABELS_EN: Record<string, string> = {
  genre: 'Genre', artist: 'Artist', album: 'Album',
  architect: 'Architect', article: 'Article', 'listening-path': 'Path',
};

function SearchResults() {
  const { locale } = useParams();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  const tr = locale === 'tr';
  const typeLabels = tr ? TYPE_LABELS_TR : TYPE_LABELS_EN;

  useEffect(() => {
    let cancelled = false;
    if (!q || q.length < 2) {
      const id = queueMicrotask
        ? (queueMicrotask(() => {
            if (cancelled) return;
            setResults([]);
            setLoading(false);
          }), 0)
        : 0;
      return () => {
        cancelled = true;
        void id;
      };
    }
    fetch(`/api/search?q=${encodeURIComponent(q)}&locale=${locale}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setResults(data.results || []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, locale]);

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen">
      {/* Editorial hero — sorgu dergi başlığı gibi büyük Fraunces'te. */}
      <section className="relative w-full min-h-[35vh] md:min-h-[40vh] flex items-end overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.04),transparent_55%)]" aria-hidden="true" />
        <div className="relative z-10 w-full max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 pb-10 md:pb-14 pt-32">
          <p className="text-zinc-500 text-[11px] tracking-[0.35em] uppercase font-bold mb-5 flex items-center gap-3">
            <span className="w-10 h-px bg-zinc-600" />
            {tr ? 'Arşivde Arama' : 'Archive Search'}
          </p>
          <h1
            className="font-editorial leading-[1] tracking-[-0.025em] break-words"
            style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 700 }}
          >
            {q ? (
              <>
                <span className="text-zinc-500 italic font-normal text-[0.7em]">
                  {tr ? 'şunu aradın:' : 'you searched for:'}
                </span>{' '}
                &ldquo;{q}&rdquo;
              </>
            ) : (
              tr ? 'Aramaya başla' : 'Start searching'
            )}
          </h1>
          {q && (
            <p className="mt-5 text-zinc-500 text-sm font-light italic">
              {loading
                ? (tr ? 'Aranıyor…' : 'Searching…')
                : (tr ? `${results.length} kayıt bulundu` : `${results.length} entries found`)}
            </p>
          )}
        </div>
      </section>

      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 py-12 md:py-16">
        {!q ? (
          <p className="text-zinc-500 italic text-sm max-w-md">
            {tr ? 'Üstteki arama kutusuna bir terim yaz — sanatçı, tür, makale, albüm.' : 'Type a term in the search box above — artist, genre, article, album.'}
          </p>
        ) : loading ? (
          <p className="text-zinc-500 italic text-sm">{tr ? 'Aranıyor…' : 'Searching…'}</p>
        ) : results.length === 0 ? (
          <div className="text-center py-20 border-t border-white/10">
            <p className="font-editorial italic text-zinc-500 text-2xl md:text-3xl leading-snug max-w-md mx-auto">
              {tr ? 'Arşivde bu terim için kayıt yok.' : "No entry in the archive for this term."}
            </p>
            <p className="mt-4 text-[11px] uppercase tracking-[0.3em] text-zinc-600 font-bold">
              {tr ? 'Farklı bir kelime dene' : 'Try a different word'}
            </p>
          </div>
        ) : (
          <div className="border-t border-white/10 max-w-3xl">
            {results.map((r, i) => (
              <Link
                key={`${r.type}-${r.slug}-${i}`}
                href={r.type === 'album' ? `/${locale}/artist/${r.slug}` : `/${locale}/${TYPE_LINKS[r.type]}/${r.slug}`}
                className="group flex items-center gap-5 py-5 border-b border-white/10 hover:bg-white/[0.02] transition-colors -mx-4 px-4 rounded-sm"
              >
                {r.image ? (
                  <img src={r.image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center font-editorial font-black text-white/20 text-2xl flex-shrink-0">
                    {r.title.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold mb-1.5">
                    {typeLabels[r.type] || r.type.replace('-', ' ')}
                  </p>
                  <p className="font-editorial text-lg md:text-xl font-semibold tracking-[-0.01em] text-white group-hover:underline decoration-1 underline-offset-4 truncate">
                    {r.title}
                  </p>
                  {r.sub && <p className="text-xs text-zinc-500 mt-1 truncate">{r.sub}</p>}
                </div>
                <span className="text-zinc-600 group-hover:text-white transition-colors text-xl flex-shrink-0">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="bg-[#0a0a0b] text-white min-h-screen pt-20"><div className="max-w-4xl mx-auto px-6 py-10 text-zinc-500 italic">Loading…</div></div>}>
      <SearchResults />
    </Suspense>
  );
}
