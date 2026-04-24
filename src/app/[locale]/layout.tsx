import { getDictionary } from '@/i18n';
import Navbar from '@/components/public/Navbar';
import Footer from '@/components/public/Footer';
import AiChat from '@/components/public/AiChat';
import SmoothScroll from '@/components/public/SmoothScroll';
import { PUBLIC_SECTIONS, getSectionEnabledMap } from '@/lib/site-sections';
import { getCustomNavItems, resolveCustomHref, isExternalHref } from '@/lib/site-custom-nav';
import { getSiteFonts, resolveFontStyle } from '@/lib/site-fonts';

export async function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Beyond The Music - Müzik Platformu' : 'Beyond The Music - Music Platform',
    description: locale === 'tr' ? 'Müziğin ötesindeki kültürü keşfeden platform' : 'A platform exploring the culture beyond music',
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

  // Self-hosted fonts via `next/font` — see src/app/fonts.ts. `className`
  // applies the `.variable` classes that *set* `--font-<family>` on the
  // wrapping div; `style` aliases `--font-body` / `--font-display` to them
  // so component CSS (`var(--font-body)`) keeps working regardless of the
  // super-admin's picks. No network request to fonts.googleapis.com, and
  // next/font auto-injects a metric-matched fallback so first paint is the
  // same visual size as the final swap.
  const { className: fontClassName, style: fontStyle } = resolveFontStyle(
    fonts.body,
    fonts.display,
  );

  return (
    <div
      className={`min-h-screen flex flex-col ${fontClassName}`}
      style={fontStyle}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:bg-emerald-500 focus:text-black focus:font-semibold focus:rounded-full"
      >
        {dict.common.skipToContent}
      </a>
      <SmoothScroll>
        <Navbar locale={locale} sections={navSections} />
        <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
        <Footer locale={locale} dict={dict} />
      </SmoothScroll>
      <AiChat locale={locale} />
    </div>
  );
}
