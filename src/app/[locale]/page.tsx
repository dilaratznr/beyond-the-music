// ISR: ana sayfa her 30 saniyede bir arka planda yeniden üretilir —
// ziyaretçiler cache'lenmiş statik HTML görür (CDN hızında), DB sadece
// dakikada ~2 kez sorgulanır. `force-dynamic` kaldırıldı çünkü her
// istekte DB turu demekti (yavaşlığın baş sorumlusu).
export const revalidate = 30;

import { getDictionary } from '@/i18n';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import HeroVideoCarousel from '@/components/public/HeroVideoCarousel';
import TextRevealOnScroll from '@/components/public/TextRevealOnScroll';
import MagneticButton from '@/components/public/MagneticButton';
import HorizontalScroll from '@/components/public/HorizontalScroll';
import CardImage from '@/components/public/CardImage';

// Kart arka plan paleti (görsel yoksa). Slug hash'iyle stabil dağıtım.
const CARD_PALETTES = [
  'from-zinc-800 to-zinc-950',
  'from-rose-900/55 to-zinc-950',
  'from-emerald-900/55 to-zinc-950',
  'from-indigo-900/60 to-zinc-950',
  'from-amber-900/50 to-zinc-950',
  'from-cyan-900/55 to-zinc-950',
  'from-purple-900/55 to-zinc-950',
  'from-orange-900/55 to-zinc-950',
];
function cardGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CARD_PALETTES[h % CARD_PALETTES.length];
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const tr = locale === 'tr';

  // publishDueArticles() intentionally NOT called here. It issues a
  // prisma.updateMany() which Next treats as dynamic data access —
  // that single call forces the whole [locale]/* subtree out of
  // static rendering (Cache-Control: no-store, full SSR every hit).
  // Scheduled → Published transitions happen via admin dashboard
  // visits, sitemap builds, and admin API mutations; worst case a
  // scheduled article appears ~30s after its publish time (the
  // page's `revalidate` window).

  const [genres, genreTotal, featuredArticles, featuredAlbums, artists, paths, settingsRaw, heroVideos] = await Promise.all([
    // Anasayfada tür sayısı 8 ile sınırlı — daha fazlası kaydırmayı uzatıyor,
    // 'Tümünü Gör' kartı zaten sonunda.
    prisma.genre.findMany({ where: { parentId: null, status: 'PUBLISHED' }, orderBy: { order: 'asc' }, take: 8 }),
    // 'Tümünü Gör' endcard'ında gerçek tür sayısını göstermek için toplam.
    prisma.genre.count({ where: { parentId: null, status: 'PUBLISHED' } }),
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
      where: { featuredOrder: { not: null }, status: 'PUBLISHED' },
      take: 6,
      orderBy: { featuredOrder: 'asc' },
      include: { artist: { select: { name: true, slug: true } } },
    }),
    prisma.artist.findMany({
      where: { status: 'PUBLISHED' },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { genres: { where: { genre: { status: 'PUBLISHED' } }, include: { genre: true } } },
    }),
    prisma.listeningPath.findMany({ where: { status: 'PUBLISHED' }, take: 4, orderBy: { createdAt: 'desc' } }),
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
      {/* SplashIntro kaldırıldı — açılışta siyah perde + küçük başlık
          kullanıcıya "sayfa boş" hissi veriyordu. Hero artık direkt
          yükleniyor, ilk paint'te içerik görünür. */}

      {/* ▸▸▸ SCENE 1: HERO - Full viewport ▸▸▸ */}
      <section className="relative h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <HeroVideoCarousel videos={heroVideos} fallbackImage={s.hero_poster_url || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1920&q=80'} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-black/10" />
        </div>
        <div className="relative z-10 max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 w-full">
          <p className="text-zinc-400 text-[11px] md:text-[13px] tracking-[0.35em] uppercase mb-6 flex items-center gap-3 font-semibold">
            <span className="w-10 h-px bg-zinc-500" />{loc('hero_subtitle')}
          </p>
          <h1 className="hero-title font-editorial tracking-[-0.04em] max-w-4xl">
            {loc('hero_title')}
          </h1>
          <p className="mt-8 text-zinc-300 text-lg md:text-xl font-light leading-relaxed max-w-2xl whitespace-pre-line">{loc('hero_desc')}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <MagneticButton href={`/${locale}/genre`} className="px-8 py-4 bg-white text-black text-sm font-bold rounded-full inline-block">{loc('hero_cta_text')} →</MagneticButton>
            <MagneticButton href={`/${locale}/listening-paths`} className="px-8 py-4 border border-white/20 text-white text-sm rounded-full inline-block">{loc('hero_cta2_text')}</MagneticButton>
          </div>
        </div>
      </section>


      {/* ▸▸▸ SCENE 3: GENRES - pin + translate yatay kaydırma ▸▸▸
          Sayfa dikey scroll'u kartları yana kaydırır (HorizontalScroll
          komponenti). Başlık üstte sabit kalır, sonra section pin'lenir
          ve kartlar 1:1 oranda yatay olarak akar. Görünür scrollbar yok,
          swipe/wheel/trackpad hepsi aynı kayma mekaniğini kullanır. */}
      <section className="relative bg-[#0a0a0b] pt-16 md:pt-20">
        <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 mb-6 md:mb-8 flex items-end justify-between gap-6 gsap-fade-up">
          <div>
            <p className="text-zinc-400 text-[11px] tracking-[0.3em] uppercase font-bold mb-3">{tr ? 'Keşfet' : 'Explore'}</p>
            <h2 className="section-title font-editorial tracking-[-0.03em]">{dict.genre.title}</h2>
            {/* Önceki "Aşağı kaydır — türler yanına akacak" metni kaldırıldı
                (Dilara: "ne saçma duruyor, tasarım kusursuz olmalı"). O cümle
                developer için yazılmış bir davranış ipucuydu; okuyucu için
                anlamı yok. Yerine editoryel bir alt-başlık: türlerin
                kültürel/sessel yelpazesini çağrıştıran iki kısa cümle. */}
            <p className="text-zinc-500 text-base md:text-lg mt-6 max-w-lg leading-relaxed font-light italic">{tr ? 'Ritimden kültüre, sesten hikayeye.' : 'From rhythm to culture, sound to story.'}</p>
          </div>
          <Link
            href={`/${locale}/genre`}
            className="hidden md:inline-flex items-center gap-2 text-[11px] font-bold text-zinc-400 hover:text-white uppercase tracking-wider whitespace-nowrap underline-grow pb-2"
          >
            {tr ? 'Tümünü Gör' : 'View All'} →
          </Link>
        </div>

        <HorizontalScroll>
          {genres.map((g) => {
            const genreName = tr ? g.nameTr : g.nameEn;
            return (
              <Link
                key={g.id}
                href={`/${locale}/genre/${g.slug}`}
                className="flex-shrink-0 w-[240px] md:w-[280px] group"
              >
                <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-zinc-900 card-shine hover-lift">
                  <CardImage
                    src={g.image}
                    letter={genreName.charAt(0)}
                    gradientClass={cardGradient(g.slug)}
                    imgClassName="opacity-65 group-hover:opacity-95 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                    <h3 className="text-xl md:text-2xl font-black font-editorial tracking-[-0.02em]">{genreName}</h3>
                    <div className="mt-2 w-0 group-hover:w-10 h-[2px] bg-white transition-all duration-500" />
                  </div>
                </div>
              </Link>
            );
          })}
          {/* Büyük "Tümünü Gör" kartı — en sonda, aynı boyut */}
          <Link
            href={`/${locale}/genre`}
            className="flex-shrink-0 w-[240px] md:w-[280px] group"
          >
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/15 group-hover:border-white/40 group-hover:bg-white/[0.06] transition-all duration-500 flex flex-col items-center justify-center gap-5 p-6">
              <div className="w-16 h-16 rounded-full border border-white/30 group-hover:border-white flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all duration-500">
                →
              </div>
              <div className="text-center">
                <p className="text-sm font-black font-editorial tracking-[-0.01em]">{tr ? 'Tümünü Gör' : 'View All'}</p>
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mt-2">{genreTotal} {tr ? 'Tür' : 'Genres'}</p>
              </div>
            </div>
          </Link>
        </HorizontalScroll>
      </section>

      {/* ▸▸▸ SCENE 4: ARTISTS - zoom-in sahne ▸▸▸
          Üst padding py-20 → pt-6/md:pt-10 (Dilara: "türler ve
          sanatçılar arası çok boşluk var"). Horizontal scroll pin'i
          zaten sticky çıktığında büyük bir viewport kalıyor, üstüne
          80px pt-20 gelmesi boşluk hissini ikiye katlıyordu. Alt padding
          aynı kaldı — sonraki section'a yumuşak geçiş için. */}
      <section className="scene pt-6 md:pt-10 pb-20 bg-[#111113] text-white">
        <div className="scene-inner max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14">
          <div className="flex items-end justify-between mb-10 gsap-fade-up">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 font-bold">Spotlight</p>
              <h2 className="text-3xl md:text-5xl font-black font-editorial mt-1 tracking-[-0.03em] gsap-title-reveal">{dict.artist.title}</h2>
            </div>
            <Link href={`/${locale}/artist`} className="text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-wider underline-grow">{tr ? 'Tümü' : 'All'} →</Link>
          </div>
          <div className="gsap-stagger grid grid-cols-2 md:grid-cols-5 gap-3">
            {artists.slice(0, 10).map((a) => (
              <Link key={a.id} href={`/${locale}/artist/${a.slug}`} className="group relative rounded-xl overflow-hidden aspect-[3/4] bg-zinc-900 hover-lift card-shine">
                <CardImage src={a.image} letter={a.name.charAt(0)} gradientClass={cardGradient(a.slug)} alt={a.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
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
        <section className="scene py-20 bg-[#0a0a0b]">
          <div className="scene-inner max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14">
            <div className="gsap-fade-up mb-12">
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-bold">{dict.home.latest}</p>
              <h2 className="text-3xl md:text-4xl font-black font-editorial mt-1 tracking-[-0.03em] gsap-title-reveal">{tr ? 'Editörün Seçimi' : "Editor's Pick"}</h2>
            </div>
            <div className="grid lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 gsap-slide-left">
                <Link href={`/${locale}/article/${articles[0].slug}`} className="group relative block rounded-2xl overflow-hidden aspect-[16/10] img-reveal card-shine bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
                  {articles[0].featuredImage ? (
                    <img src={articles[0].featuredImage} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 80px)' }} />
                    </>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 p-7 z-10">
                    <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-[10px] font-bold text-white/60 uppercase tracking-widest mb-3">{articles[0].category.replace(/_/g, ' ')}</span>
                    <h3 className="text-2xl md:text-4xl font-black font-editorial leading-tight tracking-[-0.02em] group-hover:underline decoration-2 underline-offset-4">{tr ? articles[0].titleTr : articles[0].titleEn}</h3>
                  </div>
                </Link>
              </div>
              <div className="lg:col-span-5 gsap-slide-right gsap-stagger flex flex-col gap-4">
                {articles.slice(1, 4).map((a) => {
                  const title = tr ? a.titleTr : a.titleEn;
                  return (
                    <Link key={a.id} href={`/${locale}/article/${a.slug}`} className="group flex gap-4 rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-hidden hover:bg-white/[0.05] transition-colors">
                      <div className="w-24 h-20 flex-shrink-0 overflow-hidden relative bg-gradient-to-br from-zinc-800 to-zinc-950">
                        {a.featuredImage ? (
                          <img src={a.featuredImage} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,rgba(255,255,255,0.1),transparent_60%)]" />
                        )}
                      </div>
                      <div className="py-2.5 pr-3 flex flex-col justify-center min-w-0">
                        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{a.category.replace(/_/g, ' ')}</span>
                        <h3 className="text-xs font-semibold mt-1 group-hover:underline leading-snug line-clamp-2 text-zinc-200">{title}</h3>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ▸▸▸ FEATURED ALBUMS — only rendered when the editor has curated one ▸▸▸ */}
      {featuredAlbums.length > 0 && (
        <section className="scene py-20 bg-[#0a0a0b]">
          <div className="scene-inner max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14">
            <div className="gsap-fade-up mb-10 flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-bold">{tr ? 'Öne Çıkan' : 'Featured'}</p>
                <h2 className="text-3xl md:text-4xl font-black font-editorial mt-1 tracking-[-0.03em] gsap-title-reveal">{tr ? 'Seçili Albümler' : 'Curated Albums'}</h2>
              </div>
              {/* "Tümü" linki kaldırıldı — /albums route'u yok, 404'e
                  gidiyordu. Albümler sanatçı sayfaları üstünden gezilir. */}
            </div>
            <div className="gsap-stagger grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {featuredAlbums.map((alb) => (
                <Link
                  key={alb.id}
                  href={`/${locale}/artist/${alb.artist.slug}#${alb.slug}`}
                  className="group relative block rounded-xl overflow-hidden aspect-square bg-zinc-900 hover-lift card-shine"
                >
                  <CardImage src={alb.coverImage} letter={alb.title.charAt(0)} gradientClass={cardGradient(alb.slug)} alt={alb.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
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
      <section className="scene py-20 bg-[#111113] text-white">
        <div className="scene-inner max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14">
          <div className="text-center mb-14 gsap-fade-up">
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-400 font-bold mb-2">{tr ? 'Keşfet' : 'Discover'}</p>
            <h2 className="text-3xl md:text-5xl font-black font-editorial tracking-[-0.03em] gsap-title-reveal">{tr ? 'Keşfet' : 'Explore'}</h2>
          </div>
          <div className="gsap-stagger grid md:grid-cols-3 gap-4">
            {[
              { href: `/${locale}/architects`, img: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80', title: dict.architects.title, sub: `${dict.architects.producer} · ${dict.architects.studio}` },
              { href: `/${locale}/theory`, img: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&q=80', title: dict.theory.title, sub: dict.theory.soundStructure },
              { href: `/${locale}/ai-music`, img: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80', title: 'AI MUSIC', sub: tr ? 'Algoritmik üretim' : 'Algorithmic production' },
            ].map((c) => (
              <Link key={c.href} href={c.href} className="group relative block rounded-2xl overflow-hidden aspect-[3/4] bg-zinc-800 img-zoom hover-lift card-shine">
                <img src={c.img} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity duration-700" />
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
      <section className="scene py-20 bg-[#0a0a0b]">
        <div className="scene-inner max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14">
          <div className="gsap-fade-up mb-12">
            {/* Eyebrow'un yeşili de bütün sitedeki pill yeşiliyle aynı
                AI-ish hissini veriyordu (Dilara geri bildirimi). Nötr
                zinc'e çekildi — diğer section eyebrow'larıyla tutarlı. */}
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">{tr ? 'Dinleme Yolculukları' : 'Listening Journeys'}</p>
            <h2 className="text-3xl md:text-4xl font-black font-editorial mt-1 tracking-[-0.03em] gsap-title-reveal">{dict.listeningPaths.title}</h2>
          </div>
          <div className="gsap-stagger flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
            {paths.map((p, i) => {
              const title = tr ? p.titleTr : p.titleEn;
              // Görsel yoksa her kart farklı renkli bir gradient + büyük harf alsın
              const palettes = [
                'from-zinc-800/70 via-zinc-950 to-black',
                'from-rose-900/40 via-zinc-950 to-black',
                'from-indigo-900/40 via-zinc-950 to-black',
                'from-amber-900/40 via-zinc-950 to-black',
              ];
              return (
                // Bug: kart <div> idi, tıklanmıyordu. <Link>'e çevrildi
                // ve /listening-paths/[slug] detayına gidiyor. cursor-pointer
                // sınıfı artık gerçek link anchor'ı veriyor.
                <Link
                  key={p.id}
                  href={`/${locale}/listening-paths/${p.slug}`}
                  className={`flex-shrink-0 w-[240px] group relative block rounded-2xl overflow-hidden aspect-[9/16] bg-gradient-to-br ${palettes[i % palettes.length]} img-zoom hover-lift card-shine`}
                >
                  {p.image ? (
                    <img src={p.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                  ) : (
                    <>
                      {/* Fallback: sadece gradient + diagonal tarama;
                          harf artık yok (Dilara talebi). */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]" />
                      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(60deg, transparent, transparent 30px, rgba(255,255,255,0.02) 30px, rgba(255,255,255,0.02) 60px)' }} />
                    </>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                    <span className="inline-block px-2 py-0.5 bg-white/[0.08] border border-white/15 text-zinc-200 text-[8px] font-bold uppercase tracking-widest rounded-full mb-2">{p.type}</span>
                    <h3 className="text-sm font-bold leading-tight">{title}</h3>
                    <p className="text-white/30 text-[10px] mt-1.5 line-clamp-2">{tr ? p.descriptionTr : p.descriptionEn}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ▸▸▸ SCENE 8: CULTURE BANNER - parallax ▸▸▸ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 depth-slow">
          <img src={s.culture_banner_image || 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=1920&q=80'} alt="" loading="lazy" decoding="async" className="w-full h-[130%] -mt-[15%] object-cover opacity-15" />
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
