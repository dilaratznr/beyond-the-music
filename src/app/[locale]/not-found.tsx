import Link from 'next/link';

/**
 * Bilingual 404 page.
 *
 * Why bilingual instead of locale-aware?
 *   `not-found.tsx` doesn't receive `params` (Next's file convention),
 *   so there's no clean way to know which locale the request was in.
 *   The previous version inferred locale from `headers()` by reading
 *   `x-next-pathname` / `referer`. That single call to `headers()`
 *   marks every descendant of `[locale]/*` as a dynamic route — even
 *   though Next's Cascading not-found mechanism only *renders* this
 *   file on 404s, the static analyzer pulls it into every page's
 *   dependency graph. Result: `Cache-Control: no-store`,
 *   `X-Vercel-Cache: MISS` on every public page, and the TTFB
 *   measured ~400ms where an ISR-cached response would be ~30ms.
 *
 *   Showing both TR and EN copy side-by-side costs nothing visually
 *   (404s are rare) and lets every page under `[locale]/*` be
 *   prerendered and cached at the edge.
 */
export default function LocaleNotFound() {
  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-widest text-emerald-500/60 mb-3">
          404
        </p>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Sayfa bulunamadı
        </h1>
        <h2 className="text-xl md:text-2xl font-semibold text-zinc-300 mb-4">
          Page not found
        </h2>
        <p className="text-zinc-400 mb-2 leading-relaxed">
          Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.
        </p>
        <p className="text-zinc-500 mb-8 leading-relaxed text-sm">
          The page you&rsquo;re looking for may have been moved or never existed.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/tr"
            className="px-5 py-2.5 bg-emerald-500 text-black font-semibold rounded-full hover:bg-emerald-400 transition-colors"
          >
            Ana sayfa
          </Link>
          <Link
            href="/en"
            className="px-5 py-2.5 border border-white/10 text-white font-semibold rounded-full hover:bg-white/5 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
