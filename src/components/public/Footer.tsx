import Link from 'next/link';

interface FooterProps {
  locale: string;
  dict: { footer: { rights: string; about: string; contact: string } };
}

export default function Footer({ locale, dict }: FooterProps) {
  return (
    <footer className="bg-zinc-950 text-zinc-500 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 pb-12 border-b border-zinc-800">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🎧</span>
              <span className="font-black text-white text-xl">Beyond The Music</span>
            </div>
            <p className="text-sm leading-relaxed max-w-md">
              {locale === 'tr'
                ? 'Müziğin ötesindeki kültürü keşfeden küratöryel platform. Bir arşiv. Bir atlas. Bir kürasyon.'
                : 'A curatorial platform exploring the culture beyond music. An archive. An atlas. A curation.'}
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">{locale === 'tr' ? 'Keşfet' : 'Explore'}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href={`/${locale}/genre`} className="hover:text-white transition-colors">Genre</Link></li>
              <li><Link href={`/${locale}/artist`} className="hover:text-white transition-colors">Artist</Link></li>
              <li><Link href={`/${locale}/architects`} className="hover:text-white transition-colors">The Architects</Link></li>
              <li><Link href={`/${locale}/theory`} className="hover:text-white transition-colors">The Theory</Link></li>
              <li><Link href={`/${locale}/listening-paths`} className="hover:text-white transition-colors">Listening Paths</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">{locale === 'tr' ? 'Platform' : 'Platform'}</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="hover:text-white transition-colors cursor-pointer">{dict.footer.about}</span></li>
              <li><Link href={`/${locale}/contact`} className="hover:text-white transition-colors">{dict.footer.contact}</Link></li>
              <li><span className="text-zinc-600">themusicbeyondtr@gmail.com</span></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 flex items-center justify-center">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} Beyond The Music. {dict.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
