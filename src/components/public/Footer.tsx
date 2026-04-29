import Link from 'next/link';
import type { SiteContact, SocialLink } from '@/lib/site-contact';

interface FooterBrand {
  /** Footer-özel logo URL'i. Boşsa header logosuna düşer. */
  logoUrl: string;
  /** Site adı (her zaman dolu). */
  name: string;
}

interface FooterProps {
  locale: string;
  // Tüm dict'i genişletiyoruz — footer hem `footer.*` hem `nav.*`
  // string'lerini kullanıyor. Önceden labels ("Genre", "Artist", ...)
  // hardcoded İngilizce'ydi → TR seçiliyken bile İngilizce görünüyordu.
  dict: {
    footer: { rights: string; about: string; contact: string };
    nav: {
      genre: string;
      artist: string;
      article: string;
      architects: string;
      theory: string;
      listeningPaths: string;
      aiMusic: string;
    };
  };
  /** Marka bilgisi. Bkz. src/lib/site-branding.ts */
  brand: FooterBrand;
  /** Super Admin tarafından yönetilen iletişim bilgileri. Bkz. src/lib/site-contact.ts */
  contact: SiteContact;
  /** Boş URL'li platformlar zaten filtrelenmiş olarak gelir. */
  social: SocialLink[];
}

export default function Footer({ locale, dict, brand, contact, social }: FooterProps) {
  const tr = locale === 'tr';
  const year = new Date().getFullYear();

  return (
    <footer className="bg-zinc-950 text-zinc-500 pt-20 pb-10 border-t border-zinc-900/60">
      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14">
        <div className="grid md:grid-cols-12 gap-10 pb-12 border-b border-zinc-800/60">
          {/* ── Brand block ───────────────────────────────── */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-2 mb-5">
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brand.logoUrl}
                  alt={brand.name}
                  className="h-10 w-auto max-w-[220px] object-contain"
                />
              ) : (
                <>
                  <span className="text-2xl" aria-hidden="true">🎧</span>
                  <span className="font-black text-white text-xl">{brand.name}</span>
                </>
              )}
            </div>
            <p className="text-sm leading-relaxed max-w-md text-zinc-400">
              {tr
                ? 'Müziğin ötesindeki kültürü keşfeden platform. Bir arşiv. Bir atlas. Bir kürasyon.'
                : 'A platform exploring the culture beyond music. An archive. An atlas. A curation.'}
            </p>

            {social.length > 0 && (
              <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] uppercase tracking-[0.2em] font-semibold">
                {social.map((s) => (
                  <li key={s.name}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-white transition-colors"
                    >
                      {s.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Explore (content sections) ─────────────────── */}
          <div className="md:col-span-3">
            <h4 className="text-white font-semibold text-[11px] uppercase tracking-[0.2em] mb-5">
              {tr ? 'Keşfet' : 'Explore'}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href={`/${locale}/genre`} className="hover:text-white transition-colors">
                  {dict.nav.genre}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/artist`} className="hover:text-white transition-colors">
                  {dict.nav.artist}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/article`} className="hover:text-white transition-colors">
                  {dict.nav.article}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/listening-paths`} className="hover:text-white transition-colors">
                  {dict.nav.listeningPaths}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/architects`} className="hover:text-white transition-colors">
                  {dict.nav.architects}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/theory`} className="hover:text-white transition-colors">
                  {dict.nav.theory}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/ai-music`} className="hover:text-white transition-colors">
                  {dict.nav.aiMusic}
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Platform (about/contact) ───────────────────── */}
          <div className="md:col-span-2">
            <h4 className="text-white font-semibold text-[11px] uppercase tracking-[0.2em] mb-5">
              {tr ? 'Platform' : 'Platform'}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href={`/${locale}/contact`} className="hover:text-white transition-colors">
                  {dict.footer.about}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/contact`} className="hover:text-white transition-colors">
                  {dict.footer.contact}
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Contact info ───────────────────────────────── */}
          <div className="md:col-span-2">
            <h4 className="text-white font-semibold text-[11px] uppercase tracking-[0.2em] mb-5">
              {tr ? 'İletişim' : 'Get in Touch'}
            </h4>
            <ul className="space-y-2.5 text-sm">
              {contact.email && (
                <li>
                  <a
                    href={`mailto:${contact.email}`}
                    className="hover:text-white transition-colors break-all"
                  >
                    {contact.email}
                  </a>
                </li>
              )}
              {contact.phone && (
                <li>
                  <a
                    href={`tel:${contact.phone}`}
                    className="hover:text-white transition-colors"
                  >
                    {contact.phoneDisplay || contact.phone}
                  </a>
                </li>
              )}
              {contact.addressLine && (
                <li className="text-zinc-600 leading-relaxed pt-1">
                  {contact.addressName && (
                    <span className="block text-zinc-500">{contact.addressName}</span>
                  )}
                  {contact.addressLine}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ──────────────────────────────────── */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <p>
            &copy; {year} {brand.name}. {dict.footer.rights}
          </p>
          <div className="flex items-center gap-4 tracking-wider uppercase text-[10px]">
            <Link href={`/${locale}`} className="hover:text-white transition-colors">
              {tr ? 'Ana Sayfa' : 'Home'}
            </Link>
            <span className="text-zinc-800" aria-hidden="true">·</span>
            <Link href={`/${locale}/contact`} className="hover:text-white transition-colors">
              {dict.footer.contact}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
