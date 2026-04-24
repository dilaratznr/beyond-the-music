import Link from 'next/link';
import { SITE_CONTACT } from '@/lib/site-config';

interface FooterBrand {
  /** Footer-özel logo URL'i. Boşsa header logosuna düşer. */
  logoUrl: string;
  /** Site adı (her zaman dolu). */
  name: string;
}

interface FooterProps {
  locale: string;
  dict: { footer: { rights: string; about: string; contact: string } };
  /** Marka bilgisi. Bkz. src/lib/site-branding.ts */
  brand: FooterBrand;
}

export default function Footer({ locale, dict, brand }: FooterProps) {
  return (
    <footer className="bg-zinc-950 text-zinc-500 pt-20 pb-10">
      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14">
        <div className="grid md:grid-cols-4 gap-10 pb-12 border-b border-zinc-800">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              {brand.logoUrl ? (
                // Footer logosu biraz daha büyük (h-10) — kendi başına
                // duran bölüm olduğu için daha belirgin.
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
            <p className="text-sm leading-relaxed max-w-md">
              {locale === 'tr'
                ? 'Müziğin ötesindeki kültürü keşfeden platform. Bir arşiv. Bir atlas. Bir kürasyon.'
                : 'A platform exploring the culture beyond music. An archive. An atlas. A curation.'}
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
              {/* "Hakkında" span'den Link'e çevrildi — tıklanabilir
                  görünüyordu ama bağlı olduğu bir yere gitmiyordu.
                  /contact sayfası "about" içeriğini de kapsar (iletişim
                  + platform hakkında blok), ayrı /about route'u yok. */}
              <li><Link href={`/${locale}/contact`} className="hover:text-white transition-colors">{dict.footer.about}</Link></li>
              <li><Link href={`/${locale}/contact`} className="hover:text-white transition-colors">{dict.footer.contact}</Link></li>
              <li>
                <a href={`mailto:${SITE_CONTACT.email}`} className="text-zinc-600 hover:text-white transition-colors">
                  {SITE_CONTACT.email}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 flex items-center justify-center">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} {brand.name}. {dict.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
