'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import SearchBar from './SearchBar';

interface NavSection {
  key: string;
  href: string;
  label: string;
  external?: boolean;
}

interface NavbarProps {
  locale: string;
  // Pre-filtered list of enabled nav sections, resolved server-side from
  // super-admin toggles in SiteSetting. Home is added separately.
  sections: NavSection[];
}

/**
 * Editorial/masthead tarzı navbar. NYT / Pitchfork / The Guardian
 * referansları:
 *  - Üstte hairline rule + wordmark (serif display font)
 *  - Altında ince section nav (küçük sans, harflerarası ayrık)
 *  - Aktif link altında 1px underline (fade-in)
 *  - Scroll'da solid arka plan + borderBottom
 *  - Anasayfa tepesindeyken tamamen şeffaf
 */
export default function Navbar({ locale, sections }: NavbarProps) {
  const pathname = usePathname();
  const otherLocale = locale === 'tr' ? 'en' : 'tr';
  const switchPath = pathname.replace(`/${locale}`, `/${otherLocale}`);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const homeLabel = locale === 'tr' ? 'Ana Sayfa' : 'Home';

  const links: Array<{ href: string; label: string; exact?: boolean; external?: boolean }> = [
    { href: `/${locale}`, label: homeLabel, exact: true },
    ...sections.map((s) => ({ href: s.href, label: s.label, external: s.external })),
  ];

  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isHome && !scrolled
          ? 'bg-gradient-to-b from-black/60 via-black/20 to-transparent'
          : 'bg-zinc-950/90 backdrop-blur-md border-b border-white/[0.06]',
      )}
    >
      {/* ── Masthead row ─────────────────────────────────── */}
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 pt-4 pb-2">
        {/* Sol: dil + tarih */}
        <div className="hidden md:flex items-center gap-4 text-[10px] uppercase tracking-[0.28em] text-zinc-500 font-semibold">
          <span>
            {new Date().toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
              weekday: 'long',
            })}
          </span>
          <span className="text-zinc-700">·</span>
          <Link
            href={switchPath}
            lang={otherLocale}
            hrefLang={otherLocale}
            aria-label={locale === 'tr' ? 'Switch language to English' : 'Dili Türkçe olarak değiştir'}
            className="hover:text-white transition-colors"
          >
            {locale === 'tr' ? 'EN' : 'TR'}
          </Link>
        </div>

        {/* Orta: wordmark */}
        <Link
          href={`/${locale}`}
          className="group flex-1 md:flex-none text-center"
          aria-label="Beyond The Music — Ana sayfa"
        >
          <span className="block font-editorial font-black text-white text-xl md:text-2xl tracking-[-0.02em] leading-none group-hover:opacity-80 transition-opacity">
            Beyond The Music
          </span>
          <span className="hidden md:block text-[9px] uppercase tracking-[0.4em] text-zinc-500 mt-1 font-semibold">
            {locale === 'tr' ? 'Küratöryel müzik platformu' : 'A curatorial music platform'}
          </span>
        </Link>

        {/* Sağ: search + mobile toggle */}
        <div className="flex items-center gap-3">
          <SearchBar locale={locale} />
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={
              mobileOpen
                ? locale === 'tr' ? 'Menüyü kapat' : 'Close menu'
                : locale === 'tr' ? 'Menüyü aç' : 'Open menu'
            }
            className="md:hidden text-white text-lg w-8 h-8 flex items-center justify-center"
          >
            <span aria-hidden="true">{mobileOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* ── Section nav (altta ayrı satır) ───────────────── */}
      <nav className="hidden md:block border-t border-white/[0.06]">
        <ul className="max-w-7xl mx-auto flex items-center justify-center gap-8 px-6 h-10">
          {links.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            const className = cn(
              'relative text-[11px] font-semibold uppercase tracking-[0.22em] transition-colors py-2',
              active ? 'text-white' : 'text-zinc-500 hover:text-zinc-200',
            );
            const content = (
              <>
                {link.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-white"
                  />
                )}
              </>
            );
            if (link.external) {
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                  >
                    {content}
                  </a>
                </li>
              );
            }
            return (
              <li key={link.href}>
                <Link href={link.href} className={className}>
                  {content}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Mobile drawer ────────────────────────────────── */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          className="md:hidden bg-zinc-950/98 backdrop-blur-md border-t border-white/[0.08]"
        >
          <ul className="px-6 py-4 divide-y divide-white/[0.06]">
            {links.map((link) => {
              const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
              const cls = cn(
                'flex items-center justify-between py-3.5 text-[13px] font-semibold uppercase tracking-[0.18em]',
                active ? 'text-white' : 'text-zinc-400',
              );
              if (link.external) {
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileOpen(false)}
                      className={cls}
                    >
                      <span>{link.label}</span>
                      <span className="text-zinc-600 text-lg">↗</span>
                    </a>
                  </li>
                );
              }
              return (
                <li key={link.href}>
                  <Link href={link.href} onClick={() => setMobileOpen(false)} className={cls}>
                    <span>{link.label}</span>
                    <span className="text-zinc-600 text-lg">→</span>
                  </Link>
                </li>
              );
            })}
            <li className="pt-4">
              <Link
                href={switchPath}
                lang={otherLocale}
                hrefLang={otherLocale}
                onClick={() => setMobileOpen(false)}
                className="inline-block text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 border border-white/20 px-3 py-1.5 rounded-full hover:border-white hover:text-white transition-colors"
              >
                {locale === 'tr' ? 'Switch to English' : 'Türkçe'} · {otherLocale}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
