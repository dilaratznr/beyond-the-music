import Link from 'next/link';

/**
 * 404 page under [locale]/*. Defaults to TR (no headers() call — would
 * mark entire [locale]/* subtree dynamic, breaking ISR). EN link provided.
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
      {/* Decorative bg: radial gradient + large 404 watermark (hero style). */}
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
          {/* EN link: no request-time locale probe needed. */}
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
