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
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-black/20" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full gsap-fade-up">
          <p className="eyebrow mb-6 flex items-center gap-4">
            <span className="section-number">§ 01</span>
            <span className="w-10 h-px bg-zinc-600" />
            <span>{loc('hero_subtitle')}</span>
          </p>
          <h1 className="font-editorial font-black leading-[0.9] tracking-[-0.025em] max-w-5xl" style={{ fontSize: 'clamp(3rem, 9.5vw, 8rem)' }}>
            {loc('hero_title')}
          </h1>
          <p className="mt-8 text-zinc-300 text-base md:text-xl font-light leading-[1.6] max-w-xl whitespace-pre-line">{loc('hero_desc')}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <MagneticButton href={`/${locale}/genre`} className="px-8 py-3.5 bg-white text-black text-[12px] font-bold uppercase tracking-[0.2em] inline-block hover:bg-zinc-200 transition-colors">
              {loc('hero_cta_text')} <span className="ml-2">→</span>
            </MagneticButton>
            <MagneticButton href={`/${locale}/listening-paths`} className="px-8 py-3.5 border border-white/25 text-white text-[12px] font-bold uppercase tracking-[0.2em] inline-block hover:border-white hover:bg-white/5 transition-all">
              {loc('hero_cta2_text')}
            </MagneticButton>
          </div>
        </div>
        {/* Masthead scroll indicator altta */}
        <div className="absolute bottom-8 left-0 right-0 flex items-center justify-between max-w-7xl mx-auto px-6 z-10">
          <p className="section-number hidden md:block">{tr ? 'Aşağı kaydır' : 'Scroll'} <span className="ml-2">↓</span></p>
          <p className="section-number text-zinc-600">{tr ? 'Sayı' : 'Issue'} · {new Date().getFullYear()}</p>
        </div>
      </section>


      {/* ▸▸▸ SCENE 3: GENRES - yatay scroll ▸▸▸
          Dış kapsayıcı h-screen + overflow-hidden: pin oturacağı yeri net
          bilsin ve GSAP transform'u native scroll ile çakışmasın. */}
      <div className="gsap-horizontal-scroll relative h-screen overflow-hidden">
        <div className="absolute inset-0 flex items-center overflow-hidden">
          <div className="gsap-horizontal-inner flex items-center gap-5 pl-6 pr-20 will-change-transform">
            <div className="flex-shrink-0 w-[75vw] sm:w-[45vw] md:w-[32vw] pr-8">
              <p className="section-number mb-3">§ 02 · {tr ? 'Keşfet' : 'Explore'}</p>
              <h2 className="font-editorial font-black tracking-[-0.025em] leading-[0.95]" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>{dict.genre.title}</h2>
              <div className="hairline w-20 mt-6 mb-5" />
              <p className="text-zinc-400 text-[15px] max-w-[280px] leading-[1.7]">{tr ? 'Müziğin tüm türlerini keşfet — her birinin kültürel hikayesiyle.' : 'Explore all genres — each with its cultural story.'}</p>
            </div>
            {genres.map((g, i) => (
              <Link key={g.id} href={`/${locale}/genre/${g.slug}`} className="flex-shrink-0 w-[260px] md:w-[300px] group">
                <div className="relative overflow-hidden aspect-[3/4] bg-zinc-900 img-reveal border border-white/[0.06] group-hover:border-white/20 transition-colors duration-500">
                  {g.image ? (
                    <img
                      src={g.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  {/* Kart numarası — dergi indeks hissi */}
                  <span className="absolute top-4 left-5 section-number text-zinc-400">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-2xl md:text-3xl font-black font-editorial tracking-[-0.02em] leading-[1.02]">
                      {tr ? g.nameTr : g.nameEn}
                    </h3>
                    <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-zinc-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <span className="w-0 group-hover:w-6 h-px bg-white transition-all duration-500" />
                      {tr ? 'Keşfet' : 'Read'}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            <Link href={`/${locale}/genre`} className="flex-shrink-0 w-[200px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 group">
                <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white group-hover:scale-110 transition-all text-xl">
                  →
                </div>
                <span className="section-number group-hover:text-white transition-colors">{tr ? 'Tüm türler' : 'All genres'}</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ▸▸▸ SCENE 4: ARTISTS - zoom-in sahne ▸▸▸ */}
      <section className="scene py-32 bg-[#0e0e10] text-white border-t border-white/[0.04]">
        <div className="scene-inner max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-14 pb-6 border-b border-white/[0.08]">
            <div>
              <p className="section-number mb-3">§ 03 · Spotlight</p>
              <h2 className="text-4xl md:text-6xl font-black font-editorial tracking-[-0.025em] leading-[0.95]">{dict.artist.title}</h2>
            </div>
            <Link href={`/${locale}/artist`} className="group hidden md:flex items-center gap-2 text-[11px] font-bold text-zinc-400 hover:text-white uppercase tracking-[0.22em] transition-colors">
              {tr ? 'Tüm sanatçılar' : 'All artists'}
              <span className="w-6 h-px bg-zinc-500 group-hover:w-10 group-hover:bg-white transition-all" />
            </Link>
          </div>
          <div className="gsap-stagger grid grid-cols-2 md:grid-cols-5 gap-4">
            {artists.slice(0, 10).map((a, i) => (
              <Link key={a.id} href={`/${locale}/artist/${a.slug}`} className="group relative overflow-hidden aspect-[3/4] bg-zinc-800 border border-white/[0.06] hover:border-white/20 transition-colors img-zoom">
                {a.image ? <img src={a.image} alt={a.name} className="absolute inset-0 w-full h-full object-cover" />
                  : <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-4xl text-white/20 font-editorial">♪</div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />
                <span className="absolute top-3 left-3 section-number text-zinc-300">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-black font-editorial text-lg leading-tight tracking-[-0.01em]">{a.name}</h3>
                  <p className="text-zinc-400 text-[10px] mt-1 uppercase tracking-[0.15em] truncate">{a.genres.map((g) => tr ? g.genre.nameTr : g.genre.nameEn).join(' · ')}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ▸▸▸ SCENE 5: ARTICLES ▸▸▸ */}
      {articles.length > 0 && (
        <section className="scene py-32 bg-[#0a0a0b] border-t border-white/[0.04]">
          <div className="scene-inner max-w-7xl mx-auto px-6">
            <div className="gsap-fade-up mb-14 pb-6 border-b border-white/[0.08]">
              <p className="section-number mb-3">§ 04 · {dict.home.latest}</p>
              <h2 className="text-4xl md:text-6xl font-black font-editorial tracking-[-0.025em] leading-[0.95]">{tr ? 'Editörün Seçimi' : "Editor's Pick"}</h2>
            </div>
            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 gsap-slide-left">
                <Link href={`/${locale}/article/${articles[0].slug}`} className="group relative block overflow-hidden aspect-[16/10] img-reveal border border-white/[0.06] hover:border-white/20 transition-colors">
                  {articles[0].featuredImage && <img src={articles[0].featuredImage} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                  <div className="absolute top-6 left-6 flex items-center gap-3">
                    <span className="section-number text-zinc-200">01 · {tr ? 'Manşet' : 'Lead'}</span>
                  </div>
                  <div className="absolute bottom-0 p-8 z-10 max-w-[90%]">
                    <span className="inline-block text-[10px] font-bold text-zinc-300 uppercase tracking-[0.28em] mb-4 pb-1 border-b border-white/30">{articles[0].category.replace(/_/g, ' ')}</span>
                    <h3 className="text-3xl md:text-5xl font-black font-editorial leading-[1.02] tracking-[-0.02em] group-hover:underline decoration-2 underline-offset-[6px]">{tr ? articles[0].titleTr : articles[0].titleEn}</h3>
                  </div>
                </Link>
              </div>
              <div className="lg:col-span-5 gsap-stagger flex flex-col divide-y divide-white/[0.08]">
                {articles.slice(1, 4).map((a, i) => (
                  <Link key={a.id} href={`/${locale}/article/${a.slug}`} className="group flex gap-5 py-5 first:pt-0 hover:bg-white/[0.02] transition-colors -mx-2 px-2">
                    <span className="section-number flex-shrink-0 mt-1">0{i + 2}</span>
                    {a.featuredImage && <div className="w-20 h-20 flex-shrink-0 overflow-hidden"><img src={a.featuredImage} alt="" className="w-full h-full object-cover" /></div>}
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.22em]">{a.category.replace(/_/g, ' ')}</span>
                      <h3 className="text-[15px] font-semibold font-editorial mt-1.5 group-hover:underline decoration-1 underline-offset-[5px] leading-[1.25] line-clamp-2 text-zinc-100">{tr ? a.titleTr : a.titleEn}</h3>
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
        <section className="scene py-32 bg-[#0a0a0b] border-t border-white/[0.04]">
          <div className="scene-inner max-w-7xl mx-auto px-6">
            <div className="gsap-fade-up mb-14 pb-6 border-b border-white/[0.08] flex items-end justify-between">
              <div>
                <p className="section-number mb-3">§ 05 · {tr ? 'Öne Çıkan' : 'Featured'}</p>
                <h2 className="text-4xl md:text-6xl font-black font-editorial tracking-[-0.025em] leading-[0.95]">{tr ? 'Seçili Albümler' : 'Curated Albums'}</h2>
              </div>
              <Link href={`/${locale}/albums`} className="group hidden md:flex items-center gap-2 text-[11px] font-bold text-zinc-400 hover:text-white uppercase tracking-[0.22em] transition-colors">
                {tr ? 'Tüm albümler' : 'All albums'}
                <span className="w-6 h-px bg-zinc-500 group-hover:w-10 group-hover:bg-white transition-all" />
              </Link>
            </div>
            <div className="gsap-stagger grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {featuredAlbums.map((alb, i) => (
                <Link
                  key={alb.id}
                  href={`/${locale}/artist/${alb.artist.slug}#${alb.slug}`}
                  className="group relative block overflow-hidden aspect-square bg-zinc-900 border border-white/[0.06] hover:border-white/20 transition-colors"
                >
                  {alb.coverImage ? (
                    <img src={alb.coverImage} alt={alb.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center text-4xl text-white/20 font-editorial">♪</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="absolute top-3 left-3 section-number opacity-0 group-hover:opacity-100 text-zinc-200 transition-opacity duration-500">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <h3 className="text-white font-black font-editorial text-sm leading-tight truncate">{alb.title}</h3>
                    <p className="text-zinc-400 text-[10px] mt-0.5 uppercase tracking-[0.18em] truncate">{alb.artist.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ▸▸▸ SCENE 6: PILLARS - zoom-in sahne ▸▸▸ */}
      <section className="scene py-32 bg-[#0e0e10] text-white border-t border-white/[0.04]">
        <div className="scene-inner max-w-7xl mx-auto px-6">
          <div className="mb-16 gsap-fade-up pb-6 border-b border-white/[0.08]">
            <p className="section-number mb-3">§ 06 · Discover</p>
            <h2 className="text-4xl md:text-6xl font-black font-editorial tracking-[-0.025em] leading-[0.95]">{tr ? 'Üç Sütun' : 'The Three Pillars'}</h2>
            <p className="mt-4 text-zinc-400 text-[15px] md:text-lg max-w-xl leading-[1.6]">
              {tr ? 'Platform üç ana dalda büyüyor: sesi şekillendirenler, teoriyi yazanlar, geleceği kodlayanlar.' : 'The platform grows along three pillars: those who shape the sound, those who write the theory, and those who code the future.'}
            </p>
          </div>
          <div className="gsap-stagger grid md:grid-cols-3 gap-5">
            {[
              { href: `/${locale}/architects`, img: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80', title: dict.architects.title, sub: `${dict.architects.producer} · ${dict.architects.studio}` },
              { href: `/${locale}/theory`, img: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&q=80', title: dict.theory.title, sub: dict.theory.soundStructure },
              { href: `/${locale}/ai-music`, img: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80', title: tr ? 'Yapay Zekâ Müziği' : 'AI Music', sub: tr ? 'Algoritmik üretim' : 'Algorithmic production' },
            ].map((c, i) => (
              <Link key={c.href} href={c.href} className="group relative block overflow-hidden aspect-[3/4] bg-zinc-800 border border-white/[0.06] hover:border-white/25 transition-colors">
                <img src={c.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-55 transition-all duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20" />
                <span className="absolute top-5 left-6 section-number text-zinc-300">
                  § {String(i + 1).padStart(2, '0')}
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-7 z-10">
                  <h3 className="text-3xl md:text-4xl font-black font-editorial text-white tracking-[-0.02em] leading-[1.02]">{c.title}</h3>
                  <p className="text-zinc-400 text-xs mt-3 uppercase tracking-[0.22em]">{c.sub}</p>
                  <div className="mt-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-zinc-300 font-semibold">
                    <span className="w-6 group-hover:w-12 h-px bg-white transition-all duration-500" />
                    {tr ? 'Keşfet' : 'Enter'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ▸▸▸ SCENE 7: LISTENING PATHS ▸▸▸ */}
      <section className="scene py-32 bg-[#0a0a0b] border-t border-white/[0.04]">
        <div className="scene-inner max-w-7xl mx-auto px-6">
          <div className="gsap-fade-up mb-14 pb-6 border-b border-white/[0.08] flex items-end justify-between">
            <div>
              <p className="section-number mb-3">§ 07 · Curated Journeys</p>
              <h2 className="text-4xl md:text-6xl font-black font-editorial tracking-[-0.025em] leading-[0.95]">{dict.listeningPaths.title}</h2>
            </div>
            <Link href={`/${locale}/listening-paths`} className="group hidden md:flex items-center gap-2 text-[11px] font-bold text-zinc-400 hover:text-white uppercase tracking-[0.22em] transition-colors">
              {tr ? 'Tüm rotalar' : 'All paths'}
              <span className="w-6 h-px bg-zinc-500 group-hover:w-10 group-hover:bg-white transition-all" />
            </Link>
          </div>
          <div className="gsap-stagger flex gap-5 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
            {paths.map((p, i) => (
              <div key={p.id} className="flex-shrink-0 w-[260px] group relative overflow-hidden aspect-[9/16] bg-zinc-900 border border-white/[0.06] hover:border-white/20 transition-colors cursor-pointer">
                {p.image && <img src={p.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-45 group-hover:opacity-65 transition-all duration-700 group-hover:scale-105" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                <span className="absolute top-4 left-5 section-number text-zinc-300">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                  <span className="inline-block text-[9px] font-bold text-emerald-300/90 uppercase tracking-[0.28em] mb-3 pb-0.5 border-b border-emerald-300/40">{p.type}</span>
                  <h3 className="text-lg font-black font-editorial leading-[1.1] tracking-[-0.01em]">{tr ? p.titleTr : p.titleEn}</h3>
                  <p className="text-zinc-400 text-[11px] mt-2 line-clamp-2 leading-relaxed">{tr ? p.descriptionTr : p.descriptionEn}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ▸▸▸ SCENE 8: CULTURE BANNER - parallax ▸▸▸ */}
      <section className="relative min-h-screen flex items-center overflow-hidden border-t border-white/[0.04]">
        <div className="absolute inset-0 depth-slow">
          <img src={s.culture_banner_image || 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=1920&q=80'} alt="" className="w-full h-[130%] -mt-[15%] object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0b]/60 via-transparent to-[#0a0a0b]" />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center gsap-fade-up py-24">
          <p className="section-number mb-4">§ 08 · {tr ? 'Manifesto' : 'Manifesto'}</p>
          <p className="eyebrow mb-8 text-zinc-400">{tr ? 'Moda · Müzik · Kültür' : 'Fashion · Music · Culture'}</p>
          <div className="hairline w-24 mx-auto mb-10" />
          <h2 className="font-black font-editorial leading-[1.02] tracking-[-0.02em] whitespace-pre-line" style={{ fontSize: 'clamp(2.25rem, 6vw, 5rem)' }}>
            {loc('culture_banner_title')}
          </h2>
          <p className="text-zinc-400 mt-8 max-w-xl mx-auto text-base md:text-lg leading-[1.7]">{loc('culture_banner_desc')}</p>
          <div className="mt-12">
            <MagneticButton href={`/${locale}/genre`} className="inline-block px-10 py-4 bg-white text-black text-[12px] font-bold uppercase tracking-[0.22em] hover:bg-zinc-200 transition-colors">
              {loc('hero_cta_text')} <span className="ml-2">→</span>
            </MagneticButton>
          </div>
        </div>
      </section>
    </div>
  );
}
