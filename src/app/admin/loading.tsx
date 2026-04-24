/**
 * Admin navigation iskeleti.
 *
 * Next.js App Router sayfa geçişlerinde bu dosyayı otomatik olarak
 * sonraki route hazır olana kadar fallback gösterir. Yoksa tarayıcıda
 * "tıkladım ama bir şey olmuyor" hissi oluşuyordu — server component
 * fetch'leri bittiğinde sayfa tek seferde jump ediyordu.
 *
 * İskeleti bilinçli olarak dashboard-like yapıyoruz: başlık alanı + 4'lü
 * grid + liste satırları. Gerçek sayfa ne olursa olsun yakın bir boyutta
 * ilk paint yapıyor, layout shift minimum.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      {/* Header skeleton */}
      <div className="pb-6 border-b border-white/5">
        <div className="h-3 w-48 bg-zinc-800/60 rounded-sm mb-3 animate-pulse" />
        <div className="h-8 w-40 bg-zinc-800/80 rounded animate-pulse" />
        <div className="h-3 w-72 bg-zinc-800/40 rounded-sm mt-4 animate-pulse" />
      </div>

      {/* Stat strip skeleton — 4 kart */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-zinc-900/40 rounded-lg p-4 border border-zinc-800 space-y-2"
          >
            <div className="h-2.5 w-16 bg-zinc-800/60 rounded animate-pulse" />
            <div className="h-7 w-10 bg-zinc-800/80 rounded animate-pulse" />
            <div className="h-2 w-24 bg-zinc-800/40 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* 6-wide stat grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-zinc-900/40 rounded-lg p-4 border border-zinc-800 space-y-2"
          >
            <div className="w-8 h-8 rounded-md bg-zinc-800/60 animate-pulse" />
            <div className="h-7 w-8 bg-zinc-800/80 rounded animate-pulse mt-2" />
            <div className="h-2 w-12 bg-zinc-800/40 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Liste skeleton */}
      <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <div className="h-3 w-36 bg-zinc-800/60 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-zinc-800/60">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-3 w-full max-w-[280px] bg-zinc-800/60 rounded animate-pulse" />
                <div className="h-2 w-32 bg-zinc-800/40 rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-zinc-800/50 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
