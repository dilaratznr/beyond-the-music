export const revalidate = 30;
export const dynamic = 'force-dynamic';

import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import SplashIntro from '@/components/public/SplashIntro';
import HeroVideoCarousel from '@/components/public/HeroVideoCarousel';
import TextRevealOnScroll from '@/components/public/TextRevealOnScroll';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const tr = locale === 'tr';

  const [genres, articles, artists, paths, settingsRaw, heroVideos] = await Promise.all([
    prisma.genre.findMany({ where: { parentId: null }, orderBy: { order: 'asc' } }),
    prisma.article.findMany({ where: { status: 'PUBLISHED' }, take: 6, orderBy: { publishedAt: 'desc' }, include: { author: { select: { name: true } } } }),
    prisma.artist.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { genres: { include: { genre: true } } } }),
    prisma.listeningPath.findMany({ take: 4, orderBy: { createdAt: 'desc' } }),
    prisma.siteSetting.findMany(),
    prisma.heroVideo.findMany({ where: { isActive: true }, orderBy: { order: 'asc' }, select: { id: true, url: true, duration: true } }),
  ]);

  const s: Record<string, string> = {};
  for (const r of settingsRaw) s[r.key] = r.value;
  const loc = (key: string) => s[`${key}_${locale}`] || s[`${key}_tr`] || '';

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <SplashIntro />

      {/* ████████████████████████████████████████████
          01 — HERO
      ████████████████████████████████████████████ */}
      <section className="relative h-screen">
        <div className="absolute inset-0">
          <HeroVideoCarousel videos={heroVideos} fallbackImage={s.hero_poster_url || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1920&q=80'} />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        {/* Title - centered higher */}
        <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
          <div className="gsap-fade-up text-center">
            <p className="text-zinc-400 text-[10px] tracking-[0.4em] uppercase mb-4">{loc('hero_subtitle')}</p>
            <h1 className="font-display text-white text-4xl md:text-6xl">
              <span className="font-black">{loc('hero_title').split(' ')[0]}</span>{' '}
              <span className="font-thin-display font-extralight">{loc('hero_title').split(' ').slice(1).join(' ')}</span>
            </h1>
          </div>
        </div>
      </section>

      {/* ████████████████████████████████████████████
          03 — GENRES — Horizontal scroll, overlapping
      ████████████████████████████████████████████ */}
      <div className="gsap-horizontal-scroll">
        <div className="h-screen flex items-center">
          <div className="gsap-horizontal-inner flex items-end gap-0 pl-6">
            {/* Label */}
            <div className="flex-shrink-0 w-[25vw] min-w-[200px] pr-8 pb-12">
              <p className="text-zinc-600 text-[10px] tracking-[0.3em] uppercase mb-3">01</p>
              <h2 className="font-display font-black text-white" style={{ fontSize: 'var(--display-sm)' }}>{dict.genre.title}</h2>
              <Link href={`/${locale}/genre`} className="text-zinc-500 text-[10px] uppercase tracking-widest mt-6 inline-block hover:text-white transition-colors">{tr ? 'Tümü' : 'All'} →</Link>
            </div>
            {/* Cards - varying heights */}
            {genres.slice(0, 12).map((g, i) => {
              const tall = i % 3 === 0;
              return (
                <Link key={g.id} href={`/${locale}/genre/${g.slug}`}
                  className={`flex-shrink-0 group relative rounded-lg overflow-hidden img-zoom ${tall ? 'w-[280px] h-[75vh]' : 'w-[240px] h-[55vh]'} ${i > 0 ? '-ml-3' : ''}`}>
                  {g.image ? <img src={g.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    : <div className="absolute inset-0 bg-zinc-900" />}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-white font-bold text-sm">{tr ? g.nameTr : g.nameEn}</h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ████████████████████████████████████████████
          04 — ARTISTS — Bento / asymmetric mosaic
      ████████████████████████████████████████████ */}
      <section className="py-24 px-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-zinc-600 text-[10px] tracking-[0.3em] uppercase mb-3">02</p>
              <h2 className="font-display font-black text-white" style={{ fontSize: 'var(--display-sm)' }}>{dict.artist.title}</h2>
            </div>
            <Link href={`/${locale}/artist`} className="text-zinc-500 text-[10px] uppercase tracking-widest hover:text-white transition-colors">{tr ? 'Tümünü Gör' : 'View All'} →</Link>
          </div>

          {/* Bento grid - NOT uniform */}
          <div className="gsap-stagger grid grid-cols-12 gap-3 auto-rows-[180px]">
            {artists.slice(0, 8).map((a, i) => {
              // Varying spans for bento effect
              const layouts = [
                'col-span-6 md:col-span-5 row-span-2', // big
                'col-span-6 md:col-span-3 row-span-1', // small wide
                'col-span-6 md:col-span-4 row-span-2', // tall
                'col-span-6 md:col-span-3 row-span-1', // small
                'col-span-6 md:col-span-4 row-span-1', // medium
                'col-span-6 md:col-span-5 row-span-2', // big
                'col-span-6 md:col-span-3 row-span-2', // tall narrow
                'col-span-12 md:col-span-4 row-span-1', // wide short
              ];
              return (
                <Link key={a.id} href={`/${locale}/artist/${a.slug}`}
                  className={`${layouts[i]} group relative rounded-lg overflow-hidden img-zoom hover-lift`}>
                  {a.image ? <img src={a.image} alt={a.name} className="absolute inset-0 w-full h-full object-cover" />
                    : <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center text-zinc-700 text-4xl">♪</div>}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-bold text-sm">{a.name}</h3>
                    <p className="text-white/40 text-[9px] mt-0.5">{a.genres.map((g) => tr ? g.genre.nameTr : g.genre.nameEn).join(' · ')}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>


      {/* ████████████████████████████████████████████
          06 — ARTICLES — Editorial magazine split
      ████████████████████████████████████████████ */}
      {articles.length > 0 && (
        <section className="py-24 px-6">
          <div className="max-w-[1600px] mx-auto">
            <p className="text-zinc-600 text-[10px] tracking-[0.3em] uppercase mb-3">03</p>
            <h2 className="font-display font-black text-white mb-12" style={{ fontSize: 'var(--heading)' }}>{tr ? 'Editörün Seçimi' : "Editor's Pick"}</h2>

            {/* Split: big image left, stacked articles right */}
            <div className="grid md:grid-cols-2 gap-4">
              <Link href={`/${locale}/article/${articles[0].slug}`}
                className="group relative rounded-lg overflow-hidden aspect-[4/5] img-zoom">
                {articles[0].featuredImage && <img src={articles[0].featuredImage} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 p-6 z-10">
                  <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest">{articles[0].category.replace(/_/g, ' ')}</span>
                  <h3 className="text-xl font-bold font-display mt-2 group-hover:underline underline-offset-4 decoration-1">{tr ? articles[0].titleTr : articles[0].titleEn}</h3>
                </div>
              </Link>
              <div className="flex flex-col gap-3">
                {articles.slice(1, 5).map((a) => (
                  <Link key={a.id} href={`/${locale}/article/${a.slug}`}
                    className="group flex-1 flex gap-4 items-center rounded-lg bg-white/[0.02] border border-white/[0.04] overflow-hidden hover:bg-white/[0.05] transition-colors px-4">
                    {a.featuredImage && <img src={a.featuredImage} alt="" className="w-20 h-20 rounded object-cover flex-shrink-0" />}
                    <div>
                      <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{a.category.replace(/_/g, ' ')}</span>
                      <h3 className="text-sm font-semibold mt-0.5 group-hover:underline leading-snug">{tr ? a.titleTr : a.titleEn}</h3>
                      <p className="text-[10px] text-zinc-600 mt-1">{a.author.name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ████████████████████████████████████████████
          07 — PILLARS — Outline text hover
      ████████████████████████████████████████████ */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-[1600px] mx-auto">
          <p className="text-zinc-600 text-[10px] tracking-[0.3em] uppercase mb-8">04 — {tr ? 'Keşfet' : 'Explore'}</p>
          <div className="space-y-2">
            {[
              { href: `/${locale}/architects`, label: dict.architects.title },
              { href: `/${locale}/theory`, label: dict.theory.title },
              { href: `/${locale}/listening-paths`, label: dict.listeningPaths.title },
              { href: `/${locale}/ai-music`, label: tr ? 'AI Müzik' : 'AI Music' },
              { href: `/${locale}/contact`, label: tr ? 'İletişim' : 'Contact' },
            ].map((item) => (
              <Link key={item.href} href={item.href}
                className="block text-outline font-display font-black transition-all duration-300 hover:pl-4 py-1"
                style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ████████████████████████████████████████████
          08 — LISTENING PATHS
      ████████████████████████████████████████████ */}
      <section className="py-24 px-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-zinc-600 text-[10px] tracking-[0.3em] uppercase mb-3">05</p>
              <h2 className="font-display font-black" style={{ fontSize: 'var(--heading)' }}>{dict.listeningPaths.title}</h2>
            </div>
            <Link href={`/${locale}/listening-paths`} className="text-zinc-500 text-[10px] uppercase tracking-widest hover:text-white transition-colors">{tr ? 'Tümü' : 'All'} →</Link>
          </div>
          <div className="gsap-stagger grid md:grid-cols-4 gap-3">
            {paths.map((p) => (
              <div key={p.id} className="group relative rounded-lg overflow-hidden aspect-[2/3] img-zoom cursor-pointer">
                {p.image && <img src={p.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-500" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <span className="text-[8px] font-bold text-emerald-400/70 uppercase tracking-widest">{p.type}</span>
                  <h3 className="text-sm font-bold mt-1">{tr ? p.titleTr : p.titleEn}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ████████████████████████████████████████████
          09 — CULTURE BANNER — Full-screen parallax
      ████████████████████████████████████████████ */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 depth-slow">
          <img src={s.culture_banner_image || 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=1920&q=80'} alt="" className="w-full h-[130%] -mt-[15%] object-cover opacity-15" />
        </div>
        <div className="relative z-10 max-w-[1600px] mx-auto px-6 w-full">
          <div className="gsap-fade-up max-w-3xl">
            <p className="text-zinc-600 text-[10px] tracking-[0.3em] uppercase mb-6">Fashion · Music · Culture</p>
            <h2 className="font-display font-black leading-[0.95] whitespace-pre-line" style={{ fontSize: 'var(--display-sm)' }}>
              {loc('culture_banner_title')}
            </h2>
            <p className="text-zinc-500 mt-6 max-w-md text-sm leading-relaxed">{loc('culture_banner_desc')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
