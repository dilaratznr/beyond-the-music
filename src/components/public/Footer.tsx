import Link from 'next/link';

interface FooterProps {
  locale: string;
  dict: { footer: { rights: string; about: string; contact: string } };
}

/**
 * Editorial footer — gazete/dergi masthead'ına benzer yapı:
 *  - Üstte büyük wordmark + alt-tag (curated since...)
 *  - Hairline divider
 *  - 4 kolon: hakkında / keşfet / platform / iletişim
 *  - En altta colophon — tech credits + telif
 */
export default function Footer({ locale, dict }: FooterProps) {
  const tr = locale === 'tr';
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#08080a] text-zinc-500 pt-24 pb-12 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Masthead */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <p className="eyebrow mb-4 text-zinc-600">
              {tr ? 'Küratöryel müzik platformu' : 'A curatorial music platform'}
            </p>
            <h2 className="font-editorial font-black text-white text-4xl md:text-6xl tracking-[-0.03em] leading-none">
              Beyond The Music
            </h2>
          </div>
          <p className="section-number md:text-right">
            {tr ? `Kurulu${'\u015F'} · ${year}` : `Est. ${year}`}
            <span className="block mt-1 text-zinc-700 normal-case font-normal tracking-normal font-sans text-[11px]">
              {tr ? `${year} · ${year}` : `Issue ${year}`}
            </span>
          </p>
        </div>

        <div className="hairline-strong mb-12" />

        {/* 4 kolonlu editorial grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-14">
          {/* About */}
          <div className="col-span-2 md:col-span-2">
            <h4 className="eyebrow mb-4">{tr ? 'Hakkında' : 'About'}</h4>
            <p className="text-[14px] leading-[1.75] text-zinc-400 max-w-md">
              {tr
                ? 'Müziğin ötesindeki kültürü keşfeden küratöryel platform. Bir arşiv. Bir atlas. Bir kürasyon — sanatçılar, mimarlar, teori ve dinleme rotaları arasındaki köprü.'
                : "A curatorial platform exploring the culture beyond music. An archive. An atlas. A curation — a bridge between artists, architects, theory, and listening paths."}
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="eyebrow mb-4">{tr ? 'Keşfet' : 'Explore'}</h4>
            <ul className="space-y-2.5 text-[13px]">
              <li><Link href={`/${locale}/genre`} className="text-zinc-400 hover:text-white transition-colors">{tr ? 'Türler' : 'Genres'}</Link></li>
              <li><Link href={`/${locale}/artist`} className="text-zinc-400 hover:text-white transition-colors">{tr ? 'Sanatçılar' : 'Artists'}</Link></li>
              <li><Link href={`/${locale}/architects`} className="text-zinc-400 hover:text-white transition-colors">{tr ? 'Mimarlar' : 'The Architects'}</Link></li>
              <li><Link href={`/${locale}/theory`} className="text-zinc-400 hover:text-white transition-colors">{tr ? 'Teori' : 'The Theory'}</Link></li>
              <li><Link href={`/${locale}/listening-paths`} className="text-zinc-400 hover:text-white transition-colors">{tr ? 'Dinleme Rotaları' : 'Listening Paths'}</Link></li>
            </ul>
          </div>

          {/* Contact / Platform */}
          <div>
            <h4 className="eyebrow mb-4">{tr ? 'İletişim' : 'Contact'}</h4>
            <ul className="space-y-2.5 text-[13px]">
              <li><Link href={`/${locale}/contact`} className="text-zinc-400 hover:text-white transition-colors">{dict.footer.contact}</Link></li>
              <li className="text-zinc-500 break-all">themusicbeyondtr@gmail.com</li>
            </ul>
          </div>
        </div>

        <div className="hairline-strong" />

        {/* Colophon */}
        <div className="pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-[11px]">
          <p className="text-zinc-600 tracking-wide">
            © {year} Beyond The Music · {dict.footer.rights}
          </p>
          <p className="section-number text-zinc-700">
            {tr ? 'Her hakkı saklıdır · İstanbul' : 'All rights reserved · Istanbul'}
          </p>
        </div>
      </div>
    </footer>
  );
}
