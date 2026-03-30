'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import SearchBar from './SearchBar';

interface NavbarProps {
  locale: string;
  dict: { nav: { genre: string; artist: string; architects: string; theory: string; listeningPaths: string; aiMusic: string } };
}

export default function Navbar({ locale, dict }: NavbarProps) {
  const pathname = usePathname();
  const otherLocale = locale === 'tr' ? 'en' : 'tr';
  const switchPath = pathname.replace(`/${locale}`, `/${otherLocale}`);
  const [visible, setVisible] = useState(true);
  const [lastY, setLastY] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setVisible(y < 100 || y < lastY);
      setLastY(y);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [lastY]);

  const links = [
    { href: `/${locale}/genre`, label: dict.nav.genre },
    { href: `/${locale}/artist`, label: dict.nav.artist },
    { href: `/${locale}/architects`, label: dict.nav.architects },
    { href: `/${locale}/theory`, label: dict.nav.theory },
    { href: `/${locale}/listening-paths`, label: dict.nav.listeningPaths },
    { href: `/${locale}/ai-music`, label: dict.nav.aiMusic },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-transform duration-300"
      style={{ transform: visible ? 'none' : 'translateY(-100%)' }}
    >
      <nav className="max-w-[1600px] mx-auto flex items-center justify-between px-6 h-14">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2 group">
          <div className="flex items-end gap-[2px] h-4">
            {[0.5, 0.8, 0.4, 1, 0.6].map((h, i) => (
              <div key={i} className="w-[2px] bg-white/50 group-hover:bg-white rounded-full transition-colors" style={{ height: `${h * 16}px` }} />
            ))}
          </div>
          <span className="text-white text-xs font-bold tracking-tight">BTM</span>
        </Link>

        {/* Center links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className={`text-[11px] uppercase tracking-[0.15em] transition-colors ${
                pathname.startsWith(l.href) ? 'text-white font-medium' : 'text-zinc-500 hover:text-white'
              }`}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <SearchBar locale={locale} />
          <Link href={switchPath} className="text-[10px] text-zinc-600 hover:text-white font-bold uppercase tracking-widest transition-colors">
            {otherLocale}
          </Link>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-white text-sm">
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile */}
      {mobileOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-xl px-6 py-4 space-y-3 border-t border-white/5">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
              className="block text-sm text-zinc-400 hover:text-white py-1">{l.label}</Link>
          ))}
        </div>
      )}
    </header>
  );
}
