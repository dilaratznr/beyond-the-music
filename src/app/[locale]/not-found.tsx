import Link from 'next/link';

/**
 * 404 page under `[locale]/*`.
 *
 * Why no locale detection via `headers()` anymore:
 *   Next's file conventions (layout, not-found, error, …) are hoisted
 *   into the static analyzer for every sibling / descendant route.
 *   A single `headers()` call here — even one that only runs when a
 *   404 actually fires — flags the entire `[locale]/*` subtree as
 *   dynamic. The public site drops out of ISR, Cache-Control becomes
 *   `no-store`, TTFB balloons from ~30ms (edge HIT) to ~400ms (full
 *   SSR every request).
 *
 *   Since `not-found.tsx` doesn't receive `params` (Next limitation),
 *   we can't know the originating locale cheaply. Default to TR (our
 *   primary audience) and expose an EN "home" link alongside so
 *   English visitors have a single click back.
 */
export default function LocaleNotFound() {
  const copy = {
    eyebrow: 'Hata — 404',
    title: 'Sayfa bulunamadı',
    desc: 'Aradığın sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir. Bu da bir süre kayıp kalıp yeniden keşfedilmeyi bekleyen bir parça gibi.',
    home: 'Ana sayfaya dön',
    explore: 'Türleri keşfet',
  };

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen flex items-center justify-center px-6">
      {/* Dekoratif arka plan — radyal gradient + büyük 404 watermark.
          Hero sayfasıyla aynı dil: gradient + fading number. */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.05),transparent_55%)] pointer-events-none" aria-hidden="true" />
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-editorial font-black text-white/[0.03] select-none pointer-events-none leading-none"
        style={{ fontSize: 'clamp(12rem, 30vw, 28rem)' }}
        aria-hidden="true"
      >
        404
      </span>

      <div className="relative max-w-xl text-center">
        <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500 font-bold mb-6 flex items-center justify-center gap-3">
          <span className="w-10 h-px bg-zinc-600" />
          {copy.eyebrow}
          <span className="w-10 h-px bg-zinc-600" />
        </p>
        <h1
          className="font-editorial tracking-[-0.02em] leading-[1] mb-6"
          style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 700 }}
        >
          {copy.title}
        </h1>
        <p className="text-zinc-400 text-base md:text-lg leading-relaxed mb-10 max-w-md mx-auto font-light italic">
          {copy.desc}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/tr"
            className="px-8 py-3.5 bg-white text-black font-bold rounded-full text-sm hover:bg-zinc-200 transition-colors"
          >
            {copy.home}
          </Link>
          <Link
            href="/tr/genre"
            className="px-8 py-3.5 border border-white/15 text-white font-medium rounded-full text-sm hover:bg-white/5 hover:border-white/30 transition-colors"
          >
            {copy.explore} →
          </Link>
          {/* English visitors get a one-click route back without us
              needing a request-time locale probe. */}
          <Link
            href="/en"
            className="px-8 py-3.5 border border-white/10 text-zinc-400 font-medium rounded-full text-sm hover:bg-white/5 hover:border-white/20 hover:text-white transition-colors"
          >
            English home
          </Link>
        </div>
      </div>
    </div>
  );
}
