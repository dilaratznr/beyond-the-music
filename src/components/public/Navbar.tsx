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
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-200',
      isHome && !scrolled
        ? 'bg-transparent'
        : 'bg-zinc-900/95 backdrop-blur-md shadow-sm'
    )}>
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 h-14">
        <Link href={`/${locale}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-lg">🎧</span>
          <span className="font-bold text-white text-sm tracking-tight">Beyond The Music</span>
        </Link>
        <div className="hidden md:flex items-center gap-5">
          {links.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            const className = cn(
              'text-xs font-medium transition-colors tracking-wide',
              active && !link.external ? 'text-white' : 'text-zinc-400 hover:text-white'
            );
            if (link.external) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {link.label}
                </a>
              );
            }
            return (
              <Link key={link.href} href={link.href} className={className}>
                {link.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <SearchBar locale={locale} />
          <Link
            href={switchPath}
            lang={otherLocale}
            hrefLang={otherLocale}
            aria-label={locale === 'tr' ? 'Switch language to English' : 'Dili Türkçe olarak değiştir'}
            className="text-[10px] text-zinc-400 hover:text-white font-bold uppercase tracking-widest border border-zinc-700 px-2.5 py-0.5 rounded-full hover:border-zinc-400 transition-colors"
          >
            {otherLocale}
          </Link>
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
            className="md:hidden text-white text-lg"
          >
            <span aria-hidden="true">{mobileOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </nav>
      {mobileOpen && (
        <div id="mobile-nav" className="md:hidden bg-zinc-900/98 backdrop-blur-md border-t border-zinc-800 px-6 py-3 space-y-2">
          {links.map((link) => {
            const cls = 'block text-sm font-medium text-zinc-300 hover:text-white py-2';
            if (link.external) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className={cls}
                >
                  {link.label}
                </a>
              );
            }
            return (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className={cls}>
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
