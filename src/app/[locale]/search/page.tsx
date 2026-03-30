'use client';

import { useSearchParams, useParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';

interface Result { type: string; slug: string; title: string; image: string | null; sub: string; }

const TYPE_LINKS: Record<string, string> = {
  genre: 'genre', artist: 'artist', album: 'artist',
  architect: 'architects', article: 'article', 'listening-path': 'listening-paths',
};

function SearchResults() {
  const { locale } = useParams();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q || q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}&locale=${locale}`)
      .then((r) => r.json())
      .then((data) => { setResults(data.results || []); setLoading(false); });
  }, [q, locale]);

  const tr = locale === 'tr';

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen pt-20">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-white mb-2">
          {tr ? 'Arama Sonuçları' : 'Search Results'}
        </h1>
        <p className="text-sm text-zinc-500 mb-8">
          {q ? (tr ? `"${q}" için ${results.length} sonuç bulundu` : `${results.length} results for "${q}"`) : (tr ? 'Arama terimi girin' : 'Enter a search term')}
        </p>

        {loading ? (
          <p className="text-zinc-500 text-sm">{tr ? 'Aranıyor...' : 'Searching...'}</p>
        ) : results.length === 0 && q ? (
          <div className="text-center py-16">
            <p className="text-zinc-400 text-lg mb-2">{tr ? 'Sonuç bulunamadı' : 'No results found'}</p>
            <p className="text-zinc-500 text-sm">{tr ? 'Farklı anahtar kelimeler deneyin' : 'Try different keywords'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((r, i) => (
              <Link key={`${r.type}-${r.slug}-${i}`}
                href={r.type === 'album' ? `/${locale}/artist/${r.slug}` : `/${locale}/${TYPE_LINKS[r.type]}/${r.slug}`}
                className="group flex items-center gap-4 bg-zinc-900 rounded-xl p-4  hover-lift transition-all">
                {r.image ? (
                  <img src={r.image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 text-xl flex-shrink-0">♪</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-white group-hover:underline truncate">{r.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{r.sub}</p>
                </div>
                <span className="px-2.5 py-1 bg-[#0a0a0b] text-white text-zinc-500 text-[10px] font-bold uppercase tracking-wider rounded-full flex-shrink-0">
                  {r.type.replace('-', ' ')}
                </span>
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
    <Suspense fallback={<div className="bg-[#0a0a0b] text-white min-h-screen pt-20"><div className="max-w-4xl mx-auto px-6 py-10 text-zinc-500">Loading...</div></div>}>
      <SearchResults />
    </Suspense>
  );
}
