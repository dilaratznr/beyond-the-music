'use client';

import Link from 'next/link';

/**
 * Shared chrome for /admin/login, /admin/forgot-password, /admin/reset-password.
 * Split layout: brand panel on the left (desktop), form on the right. On
 * mobile the brand panel collapses and only the form shows with a compact header.
 */
export default function AuthLayout({
  children,
  eyebrow,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  // Left-panel subtitle ("Admin Console", "Parola Sıfırlama" vb.)
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-zinc-950">
      {/* Left: brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black overflow-hidden">
        <div aria-hidden="true" className="absolute -top-32 -left-32 w-[480px] h-[480px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-40 -right-20 w-[520px] h-[520px] bg-violet-500/10 rounded-full blur-3xl" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-white/90 hover:text-white transition-colors"
          >
            <span className="text-xl">🎧</span>
            <span className="text-sm font-bold tracking-tight">Beyond The Music</span>
          </Link>
        </div>

        <div className="relative max-w-md">
          {eyebrow && (
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/80 font-semibold mb-4">
              {eyebrow}
            </p>
          )}
          <h2 className="text-4xl xl:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-5 font-editorial">
            {title ?? 'Müziğin ötesindeki kültürü yönet.'}
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {subtitle ??
              'Türler, sanatçılar, makaleler ve dinleme rotaları — küratöryel platformun arka odası. Sadece yetkili kullanıcılar erişebilir.'}
          </p>
        </div>

        <div className="relative flex items-center gap-6 text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
          <span>© Beyond The Music</span>
          <span className="w-1 h-1 rounded-full bg-zinc-700" aria-hidden="true" />
          <Link href="/" className="hover:text-zinc-300 transition-colors">
            Siteye dön
          </Link>
        </div>
      </aside>

      {/* Right: form */}
      <main className="flex items-center justify-center p-6 sm:p-12 bg-zinc-950 lg:bg-zinc-900/40 lg:border-l lg:border-zinc-800">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-xl">🎧</span>
            <span className="text-sm font-bold tracking-tight text-zinc-100">Beyond The Music</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
