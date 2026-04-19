import Link from 'next/link';
import { headers } from 'next/headers';

export default async function LocaleNotFound() {
  // not-found.tsx does not receive params, so we infer the locale from the request path.
  const h = await headers();
  const pathname =
    h.get('x-next-pathname') ||
    h.get('x-pathname') ||
    h.get('x-invoke-path') ||
    h.get('referer') ||
    '';
  const locale = /\/(tr)(\/|$)/.test(pathname) ? 'tr' : 'en';

  const copy =
    locale === 'tr'
      ? {
          title: 'Sayfa bulunamadı',
          desc: 'Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.',
          home: 'Ana sayfaya dön',
          explore: 'Keşfet',
        }
      : {
          title: 'Page not found',
          desc: 'The page you’re looking for may have been moved or never existed.',
          home: 'Go home',
          explore: 'Explore',
        };

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-widest text-emerald-500/60 mb-3">
          404
        </p>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{copy.title}</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">{copy.desc}</p>
        <div className="flex gap-3 justify-center">
          <Link
            href={`/${locale}`}
            className="px-5 py-2.5 bg-emerald-500 text-black font-semibold rounded-full hover:bg-emerald-400 transition-colors"
          >
            {copy.home}
          </Link>
          <Link
            href={`/${locale}/genre`}
            className="px-5 py-2.5 border border-white/10 text-white font-semibold rounded-full hover:bg-white/5 transition-colors"
          >
            {copy.explore}
          </Link>
        </div>
      </div>
    </div>
  );
}
