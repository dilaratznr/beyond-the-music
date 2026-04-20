// ISR: ana sayfa her 30 saniyede bir arka planda yeniden üretilir —
// ziyaretçiler cache'lenmiş statik HTML görür (CDN hızında), DB sadece
// dakikada ~2 kez sorgulanır. `force-dynamic` kaldırıldı çünkü her
// istekte DB turu demekti (yavaşlığın baş sorumlusu).
export const revalidate = 30;

import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import { publishDueArticles } from '@/lib/article-publishing';
import Link from 'next/link';
import SplashIntro from '@/components/public/SplashIntro';
import HeroVideoCarousel from '@/components/public/HeroVideoCarousel';
import TextRevealOnScroll from '@/components/public/TextRevealOnScroll';
import MagneticButton from '@/components/public/MagneticButton';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const tr = locale === 'tr';

  // Zamanlanmış makaleleri yayına çevir, ama bunu render'ı bloklamadan yap —
  // cache yenilenirken 30s'de bir çalışması yeter, kullanıcıyı bekletmeye
  // gerek yok. (Eksik kalsa da bir sonraki revalidate'da yakalanır.)
  publishDueArticles().catch(() => {});

  const [genres, featuredArticles, featuredAlbums, artists, paths, settingsRaw, heroVideos] = await Promise.all([
    prisma.genre.findMany({ where: { parentId: null }, orderBy: { order: 'asc' } }),
    // Hand-curated featured articles first (must be PUBLISHED — we don't want
    // drafts leaking to the homepage). If the editor hasn't curated anything,
    // we fall back to the 6 most-recent published articles below.
    prisma.article.findMany({
      where: { status: 'PUBLISHED', featuredOrder: { not: null } },
      take: 6,
      orderBy: { featuredOrder: 'asc' },
      include: { author: { select: { name: true } } },
    }),
    // Curated featured albums — only rendered if any are set.
    prisma.album.findMany({
      where: { featuredOrder: { not: null } },
      take: 6,
      orderBy: { featuredOrder: 'asc' },
      include: { artist: { select: { name: true, slug: true } } },
    }),
    prisma.artist.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { genres: { include: { genre: true } } } }),
    prisma.listeningPath.findMany({ take: 4, orderBy: { createdAt: 'desc' } }),
    prisma.siteSetting.findMany(),
    prisma.heroVideo.findMany({ where: { isActive: true }, orderBy: { order: 'asc' }, select: { id: true, url: true, duration: true } }),
  ]);

  // Graceful fallback: if nothing's been curated, show the 6 most-recent
  // published articles so the "Editor's Pick" section never looks empty.
  const articles =
    featuredArticles.length > 0
      ? featuredArticles
      : await prisma.article.findMany({
          where: { status: 'PUBLISHED' },
          take: 6,
          orderBy: { publishedAt: 'desc' },
          include: { author: { select: { name: true } } },
        });

  const s: Record<string, string> = {};
  for (const r of settingsRaw) s[r.key] = r.value;
  const loc = (key: string) => s[`${key}_${locale}`] || s[`${key}_tr`] || '';

  return (
    <div className="bg-[#0a0a0b] text-white">
      <SplashIntro title={loc('hero_title') || undefined} tagline={loc('hero_subtitle') || undefined} />

      {/* ▸▸▸ SCENE 1: HERO - Full viewport ▸▸▸ */}
      <section className="relative h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <HeroVideoCarousel videos={heroVideos} fallbackImage={s.hero_poster_url || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1920&q=80'} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-black/10" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <p className="text-zinc-400 text-[11px] tracking-[0.35em] uppercase mb-6 flex items-center gap-3 font-semibold">
            <span className="w-10 h-px bg-zinc-500" />{loc('hero_subtitle')}
          </p>
          <h1 className="font-editorial font-black leading-[0.9] tracking-[-0.04em] max-w-4xl" style={{ fontSize: 'clamp(3rem, 9vw, 7.5rem)' }}>
            {loc('hero_title')}
          </h1>
          <p className="mt-7 text-zinc-400 text-base md:text-lg font-light leading-relaxed max-w-xl whitespace-pre-line">{loc('hero_desc')}</p>
          <div className="mt-8 flex gap-3">
            <MagneticButton href={`/${locale}/genre`} className="px-7 py-3 bg-white text-black text-sm font-bold rounded-full inline-block">{loc('hero_cta_text')} →</MagneticButton>
            <MagneticButton href={`/${locale}/listening-paths`} className="px-7 py-3 border border-white/20 text-white text-sm rounded-full inline-block">{loc('hero_cta2_text')}</MagneticButton>
          </div>
        </div>
      </section>


      {/* ▸▸▸ SCENE 3: GENRES - yatay scroll ▸▸▸
          Dış kapsayıcı h-screen + overflow-hidden: pin oturacağı yeri net
          bilsin ve GSAP transform'u native scroll ile çakışmasın. */}
      <div className="gsap-horizontal-scroll relative h-screen overflow-hidden">
        <div className="absolute inset-0 flex items-center overflow-hidden">
          <div className="gsap-horizontal-inner flex items-center gap-5 pl-6 pr-20 will-change-transform">
            <div className="flex-shrink-0 w-[75vw] sm:w-[45vw] md:w-[28vw] pr-6">
              <p className="text-zinc-400 text-[11px] tracking-[0.3em] uppercase font-bold mb-2">{tr ? 'Keşfet' : 'Explore'}</p>
              <h2 className="font-editorial font-black tracking-[-0.03em] leading-[0.95] gsap-title-reveal" style={{ fontSize: 'clamp(2.25rem, 5.5vw, 4.5rem)' }}>{dict.genre.title}</h2>
              <div className="w-12 h-[2px] bg-white/20 mt-5 mb-4 gsap-line" />
              <p className="text-zinc-500 text-sm max-w-[260px] leading-relaxed">{tr ? 'Müziğin tüm türlerini keşfet — her birinin kültürel hikayesiyle.' : 'Explore all genres — each with its cultural story.'}</p>
            </div>
            {genres.map((g) => (
              <Link key={g.id} href={`/${locale}/genre/${g.slug}`} className="flex-shrink-0 w-[260px] md:w-[300px] group">
                <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-zinc-900 img-reveal card-shine">
                  {g.image ? (
                    <img
                      src={g.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-2xl font-black font-editorial tracking-[-0.02em]">{tr ? g.nameTr : g.nameEn}</h3>
                    <div className="mt-2 w-0 group-hover:w-8 h-[2px] bg-white transition-all duration-500" />
                  </div>
                </div>
              </Link>
            ))}
            <Link href={`/${locale}/genre`} className="flex-shrink-0 w-[180px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center hover:scale-110 transition-transform text-lg">→</div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">{tr ? 'Tümü' : 'All'}</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ▸▸▸ SCENE 4: ARTISTS - zoom-in sahne ▸▸▸ */}
      <section className="scene py-28 bg-[#111113] text-white">
        <div className="scene-inner max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10 gsap-fade-up">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 font-bold">Spotlight</p>
              <h2 className="text-3xl md:text-5xl font-black font-editorial mt-1 tracking-[-0.03em] gsap-title-reveal">{dict.artist.title}</h2>
            </div>
            <Link href={`/${locale}/artist`} className="text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-wider underline-grow">{tr ? 'Tümü' : 'All'} →</Link>
          </div>
          <div className="gsap-stagger grid grid-cols-2 md:grid-cols-5 gap-3">
            {artists.slice(0, 10).map((a) => (
              <Link key={a.id} href={`/${locale}/artist/${a.slug}`} className="group relative rounded-xl overflow-hidden aspect-[3/4] bg-zinc-800 img-zoom hover-lift card-shine">
                {a.image ? <img src={a.image} alt={a.name} className="absolute inset-0 w-full h-full object-cover" />
                  : <div className="absolute inset-0 bg-gradient-to-br from-zinc-400 to-zinc-700 flex items-center justify-center text-4xl text-white/20">♪</div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-white font-bold text-xs">{a.name}</h3>
                  <p className="text-white/40 text-[9px] mt-0.5">{a.genres.map((g) => tr ? g.genre.nameTr : g.genre.nameEn).join(' · ')}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ▸▸▸ SCENE 5: ARTICLES ▸▸▸ */}
      {articles.length > 0 && (
        <section className="scene py-28 bg-[#0a0a0b]">
          <div className="scene-inner max-w-7xl mx-auto px-6">
            <div className="gsap-fade-up mb-12">
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-bold">{dict.home.latest}</p>
              <h2 className="text-3xl md:text-4xl font-black font-editorial mt-1 tracking-[-0.03em] gsap-title-reveal">{tr ? 'Editörün Seçimi' : "Editor's Pick"}</h2>
            </div>
            <div className="grid lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 gsap-slide-left">
                <Link href={`/${locale}/article/${articles[0].slug}`} className="group relative block rounded-2xl overflow-hidden aspect-[16/10] img-reveal card-shine">
                  {articles[0].featuredImage && <img src={articles[0].featuredImage} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 p-7 z-10">
                    <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-[10px] font-bold text-white/60 uppercase tracking-widest mb-3">{articles[0].category.replace(/_/g, ' ')}</span>
                    <h3 className="text-2xl md:text-4xl font-black font-editorial leading-tight tracking-[-0.02em] group-hover:underline decoration-2 underline-offset-4">{tr ? articles[0].titleTr : articles[0].titleEn}</h3>
                  </div>
                </Link>
              </div>
              <div className="lg:col-span-5 gsap-slide-right gsap-stagger flex flex-col gap-4">
                {articles.slice(1, 4).map((a) => (
                  <Link key={a.id} href={`/${locale}/article/${a.slug}`} className="group flex gap-4 rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-hidden hover:bg-white/[0.05] transition-colors">
                    {a.featuredImage && <div className="w-24 h-20 flex-shrink-0 overflow-hidden"><img src={a.featuredImage} alt="" className="w-full h-full object-cover" /></div>}
                    <div className="py-2.5 pr-3 flex flex-col justify-center min-w-0">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{a.category.replace(/_/g, ' ')}</span>
                      <h3 className="text-xs font-semibold mt-1 group-hover:underline leading-snug line-clamp-2 text-zinc-200">{tr ? a.titleTr : a.titleEn}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ▸▸▸ FEATURED ALBUMS — only rendered when the editor has curated one ▸▸▸ */}
      {featuredAlbums.length > 0 && (
        <section className="scene py-28 bg-[#0a0a0b]">
          <div className="scene-inner max-w-7xl mx-auto px-6">
            <div className="gsap-fade-up mb-10 flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-bold">{tr ? 'Öne Çıkan' : 'Featured'}</p>
                <h2 className="text-3xl md:text-4xl font-black font-editorial mt-1 tracking-[-0.03em] gsap-title-reveal">{tr ? 'Seçili Albümler' : 'Curated Albums'}</h2>
              </div>
              <Link href={`/${locale}/albums`} className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-wider underline-grow">{tr ? 'Tümü' : 'All'} →</Link>
            </div>
            <div className="gsap-stagger grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {featuredAlbums.map((alb) => (
                <Link
                  key={alb.id}
                  href={`/${locale}/artist/${alb.artist.slug}#${alb.slug}`}
                  className="group relative block rounded-xl overflow-hidden aspect-square bg-zinc-900 img-zoom hover-lift card-shine"
                >
                  {alb.coverImage ? (
                    <img src={alb.coverImage} alt={alb.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center text-4xl text-white/20">♪</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-white font-bold text-xs truncate">{alb.title}</h3>
                    <p className="text-white/50 text-[10px] mt-0.5 truncate">{alb.artist.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ▸▸▸ SCENE 6: PILLARS - zoom-in sahne ▸▸▸ */}
      <section className="scene py-28 bg-[#111113] text-white">
        <div className="scene-inner max-w-7xl mx-auto px-6">
          <div className="text-center mb-14 gsap-fade-up">
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-400 font-bold mb-2">Discover</p>
            <h2 className="text-3xl md:text-5xl font-black font-editorial tracking-[-0.03em] gsap-title-reveal">{tr ? 'Keşfet' : 'Explore'}</h2>
          </div>
          <div className="gsap-stagger grid md:grid-cols-3 gap-4">
            {[
              { href: `/${locale}/architects`, img: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80', title: dict.architects.title, sub: `${dict.architects.producer} · ${dict.architects.studio}` },
              { href: `/${locale}/theory`, img: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&q=80', title: dict.theory.title, sub: dict.theory.soundStructure },
              { href: `/${locale}/ai-music`, img: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80', title: 'AI MUSIC', sub: tr ? 'Algoritmik üretim' : 'Algorithmic production' },
            ].map((c) => (
              <Link key={c.href} href={c.href} className="group relative block rounded-2xl overflow-hidden aspect-[3/4] bg-zinc-800 img-zoom hover-lift card-shine">
                <img src={c.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                  <h3 className="text-2xl md:text-3xl font-black font-editorial text-white tracking-[-0.02em]">{c.title}</h3>
                  <p className="text-white/30 text-xs mt-1">{c.sub}</p>
                  <div className="mt-3 w-0 group-hover:w-10 h-[2px] bg-white transition-all duration-500" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ▸▸▸ SCENE 7: LISTENING PATHS ▸▸▸ */}
      <section className="scene py-28 bg-[#0a0a0b]">
        <div className="scene-inner max-w-7xl mx-auto px-6">
          <div className="gsap-fade-up mb-12">
            <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-500/50 font-bold">Curated Journeys</p>
            <h2 className="text-3xl md:text-4xl font-black font-editorial mt-1 tracking-[-0.03em] gsap-title-reveal">{dict.listeningPaths.title}</h2>
          </div>
          <div className="gsap-stagger flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
            {paths.map((p) => (
              <div key={p.id} className="flex-shrink-0 w-[240px] group relative rounded-2xl overflow-hidden aspect-[9/16] bg-zinc-900 img-zoom hover-lift card-shine cursor-pointer">
                {p.image && <img src={p.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-500" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                  <span className="inline-block px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-bold uppercase tracking-widest rounded-full mb-2">{p.type}</span>
                  <h3 className="text-sm font-bold leading-tight">{tr ? p.titleTr : p.titleEn}</h3>
                  <p className="text-white/30 text-[10px] mt-1.5 line-clamp-2">{tr ? p.descriptionTr : p.descriptionEn}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ▸▸▸ SCENE 8: CULTURE BANNER - parallax ▸▸▸ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 depth-slow">
          <img src={s.culture_banner_image || 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=1920&q=80'} alt="" className="w-full h-[130%] -mt-[15%] object-cover opacity-15" />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center gsap-fade-up py-20">
          <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 font-bold mb-6">{tr ? 'Moda · Müzik · Kültür' : 'Fashion · Music · Culture'}</p>
          <h2 className="font-black font-editorial leading-[1.1] whitespace-pre-line gsap-title-reveal" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
            {loc('culture_banner_title')}
          </h2>
          <p className="text-zinc-500 mt-5 max-w-lg mx-auto text-sm leading-relaxed gsap-rise">{loc('culture_banner_desc')}</p>
          <div className="mt-10">
            <MagneticButton href={`/${locale}/genre`} className="inline-block px-10 py-4 bg-white text-black font-bold rounded-full text-sm">
              {loc('hero_cta_text')}
            </MagneticButton>
          </div>
        </div>
      </section>
    </div>
  );
}
