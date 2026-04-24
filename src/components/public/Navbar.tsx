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

interface NavbarBrand {
  /** Logo URL'i — admin panelinden yüklenir; boşsa 🎧 emoji fallback */
  logoUrl: string;
  /** Logonun yanındaki metin; her zaman dolu (fallback "Beyond The Music") */
  name: string;
}

interface NavbarProps {
  locale: string;
  // Pre-filtered list of enabled nav sections, resolved server-side from
  // super-admin toggles in SiteSetting. Home is added separately.
  sections: NavSection[];
  /** Marka bilgisi. Bkz. src/lib/site-branding.ts */
  brand: NavbarBrand;
}

export default function Navbar({ locale, sections, brand }: NavbarProps) {
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

  // Aynı sayfaya tekrar tıklama davranışı (Dilara: "anasayfadayken
  // logoya ya da Ana Sayfa'ya basınca yukarı çıkmalı"). Router-level'da
  // aynı route'a tıklamak zaten noop — kullanıcı scroll pozisyonunda
  // kalıyor. Bunun yerine preventDefault edip smooth scroll ile en
  // tepeye çıkıyoruz. Mobile menü ise kapanıyor.
  function scrollToTop(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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
      <nav className="max-w-[1480px] mx-auto flex items-center justify-between px-6 lg:px-10 xl:px-14 h-14">
        <Link
          href={`/${locale}`}
          onClick={isHome ? scrollToTop : undefined}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label={brand.name}
        >
          {brand.logoUrl ? (
            // Admin'den yüklenen logo — `h-8` ile navbar yüksekliğine
            // (h-14 = 56px) sığıyor, `w-auto` en-boy oranını korur.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.name}
              className="h-8 w-auto max-w-[160px] object-contain"
            />
          ) : (
            <>
              <span className="text-lg" aria-hidden="true">🎧</span>
              <span className="font-bold text-white text-sm tracking-tight">{brand.name}</span>
            </>
          )}
        </Link>
        <div className="hidden md:flex items-center gap-7 lg:gap-8">
          {links.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            const className = cn(
              'text-[13px] font-medium transition-colors tracking-wide',
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
            // Aynı sayfaya tıklamak = yukarı scroll (Ana Sayfa / zaten o
            // section'daki bir link için). Başka sayfaya gidiyorsa normal
            // Next router navigasyonu.
            const onSamePage = link.exact
              ? pathname === link.href
              : pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onSamePage ? scrollToTop : undefined}
                className={className}
              >
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
        <div
          id="mobile-nav"
          className="md:hidden bg-zinc-950/98 backdrop-blur-xl border-t border-white/10 px-6 pt-6 pb-10"
        >
          {/* Editorial mobile drawer — eyebrow + link'ler Fraunces'te,
              her biri büyük satırlar, üstlerinde ince çizgi. Dergi
              içindekiler sayfası hissi. */}
          <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500 font-bold mb-6">
            {locale === 'tr' ? 'Menü' : 'Menu'}
          </p>
          <nav aria-label="Mobile navigation" className="border-t border-white/10">
            {links.map((link) => {
              const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
              const cls = cn(
                'group flex items-baseline justify-between py-4 border-b border-white/10 transition-colors',
                active ? 'text-white' : 'text-zinc-400 hover:text-white'
              );
              const content = (
                <>
                  <span className="font-editorial text-2xl tracking-[-0.01em] font-semibold">
                    {link.label}
                  </span>
                  <span className="text-sm text-zinc-600 group-hover:text-white transition-colors">
                    →
                  </span>
                </>
              );
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
                    {content}
                  </a>
                );
              }
              const onSamePage = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onSamePage ? scrollToTop : () => setMobileOpen(false)}
                  className={cls}
                >
                  {content}
                </Link>
              );
            })}
          </nav>
          {/* Alt imza — dil geçişi hatırlatması, footer'daki gibi küçük
              uppercase metin. */}
          <p className="mt-8 text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-semibold">
            {brand.name} · {new Date().getFullYear()}
          </p>
        </div>
      )}
    </header>
  );
}
