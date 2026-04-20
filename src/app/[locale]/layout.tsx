import { getDictionary } from '@/i18n';
import Navbar from '@/components/public/Navbar';
import Footer from '@/components/public/Footer';
import AiChat from '@/components/public/AiChat';
import TopLoader from '@/components/public/TopLoader';
import SmoothScroll from '@/components/public/SmoothScroll';
import { PUBLIC_SECTIONS, getSectionEnabledMap } from '@/lib/site-sections';
import { getCustomNavItems, resolveCustomHref, isExternalHref } from '@/lib/site-custom-nav';
import { getSiteFonts, buildGoogleFontsHref, toCssFontFamily } from '@/lib/site-fonts';

export async function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Beyond The Music - Küratöryel Müzik Platformu' : 'Beyond The Music - Curated Music Platform',
    description: locale === 'tr' ? 'Müziğin ötesindeki kültürü keşfeden küratöryel platform' : 'A curatorial platform exploring the culture beyond music',
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const [enabledMap, fonts, customNav] = await Promise.all([
    getSectionEnabledMap(),
    getSiteFonts(),
    getCustomNavItems(),
  ]);

  // Resolve a human label for each section from the locale dictionary.
  const builtInSections = PUBLIC_SECTIONS.filter((s) => enabledMap[s.key]).map((s) => {
    const [group, leaf] = s.labelKey.split('.') as [keyof typeof dict, string];
    const dictGroup = dict[group] as Record<string, string> | undefined;
    const label = dictGroup?.[leaf] ?? s.key;
    return { key: s.key, href: `/${locale}${s.href}`, label, external: false };
  });

  // Append super-admin-defined custom links. External links open in a new tab;
  // relative paths are prefixed with the active locale.
  const customSections = customNav
    .filter((item) => item.enabled)
    .map((item) => ({
      key: `custom_${item.id}`,
      href: resolveCustomHref(item.href, locale),
      label: (locale === 'tr' ? item.labelTr : item.labelEn) || item.labelTr || item.labelEn,
      external: isExternalHref(item.href),
    }));

  const navSections = [...builtInSections, ...customSections];

  // Load the chosen Google Fonts and override the --font-body / --font-display
  // CSS vars via an inline style on the wrapping div. Using a style attribute
  // (instead of a <style> tag) keeps us CSP-friendly — nonce-based CSP blocks
  // nonce-less <style> elements, but inline style attributes are covered by
  // 'unsafe-inline' alongside the nonce.
  const fontsHref = buildGoogleFontsHref([fonts.body, fonts.display]);
  const fontVars = {
    '--font-body': toCssFontFamily(fonts.body),
    '--font-display': toCssFontFamily(fonts.display),
    // Apply directly so descendants inherit (body is an ancestor of this div
    // and won't see the cascaded vars on its own).
    fontFamily: 'var(--font-body)',
  } as React.CSSProperties;

  return (
    <div className="min-h-screen flex flex-col" style={fontVars}>
      {/* Preconnect to Google Fonts CDNs so the TLS handshake is already
          done by the time the stylesheet <link> fires its request. Saves
          ~150-300ms on cold loads — otherwise Outfit 900 doesn't arrive
          before the hero paints, and the fallback font (narrower letters)
          makes "BEYOND THE MUSIC" look visibly smaller on refresh. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" precedence="default" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" precedence="default" />
      {fontsHref && (
        <link
          rel="stylesheet"
          href={fontsHref}
          // Next.js 16 hoists <link> with precedence to <head>.
          precedence="default"
        />
      )}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:bg-emerald-500 focus:text-black focus:font-semibold focus:rounded-full"
      >
        {dict.common.skipToContent}
      </a>
      <TopLoader />
      <SmoothScroll>
        <Navbar locale={locale} sections={navSections} />
        <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
        <Footer locale={locale} dict={dict} />
      </SmoothScroll>
      <AiChat locale={locale} />
    </div>
  );
}
