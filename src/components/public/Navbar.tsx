'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import SearchBar from './SearchBar';

interface NavbarProps {
  locale: string;
  dict: {
    nav: { genre: string; artist: string; architects: string; theory: string; listeningPaths: string; aiMusic: string };
  };
}

export default function Navbar({ locale, dict }: NavbarProps) {
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

  const links = [
    { href: `/${locale}`, label: homeLabel, exact: true },
    { href: `/${locale}/genre`, label: dict.nav.genre },
    { href: `/${locale}/artist`, label: dict.nav.artist },
    { href: `/${locale}/architects`, label: dict.nav.architects },
    { href: `/${locale}/theory`, label: dict.nav.theory },
    { href: `/${locale}/listening-paths`, label: dict.nav.listeningPaths },
    { href: `/${locale}/ai-music`, label: dict.nav.aiMusic },
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
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-xs font-medium transition-colors tracking-wide',
                ((link as {exact?: boolean}).exact ? pathname === link.href : pathname.startsWith(link.href)) ? 'text-white' : 'text-zinc-400 hover:text-white'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <SearchBar locale={locale} />
          <Link href={switchPath}
            className="text-[10px] text-zinc-400 hover:text-white font-bold uppercase tracking-widest border border-zinc-700 px-2.5 py-0.5 rounded-full hover:border-zinc-400 transition-colors">
            {otherLocale}
          </Link>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-white text-lg">
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>
      {mobileOpen && (
        <div className="md:hidden bg-zinc-900/98 backdrop-blur-md border-t border-zinc-800 px-6 py-3 space-y-2">
          <Link href={`/${locale}`} onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-white py-2">
            {locale === 'tr' ? 'Ana Sayfa' : 'Home'}
          </Link>
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-zinc-300 hover:text-white py-2">{link.label}</Link>
          ))}
        </div>
      )}
    </header>
  );
}
