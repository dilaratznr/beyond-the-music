import Link from 'next/link';

interface FooterProps { locale: string; dict: { footer: { rights: string; about: string; contact: string } }; }

export default function Footer({ locale, dict }: FooterProps) {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="flex items-end gap-[2px] h-3">
              {[0.4, 0.7, 0.3, 0.9, 0.5].map((h, i) => (
                <div key={i} className="w-[1.5px] bg-zinc-600 rounded-full" style={{ height: `${h * 12}px` }} />
              ))}
            </div>
            <span className="text-zinc-500 text-[10px] font-bold tracking-tight">BEYOND THE MUSIC</span>
          </div>

          <div className="flex gap-6 text-[10px] text-zinc-600">
            <Link href={`/${locale}/genre`} className="hover:text-white transition-colors">Genre</Link>
            <Link href={`/${locale}/artist`} className="hover:text-white transition-colors">Artist</Link>
            <Link href={`/${locale}/architects`} className="hover:text-white transition-colors">Architects</Link>
            <Link href={`/${locale}/contact`} className="hover:text-white transition-colors">{dict.footer.contact}</Link>
          </div>

          <p className="text-zinc-700 text-[9px]">&copy; {new Date().getFullYear()} BTM. {dict.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
