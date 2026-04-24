import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { publishDueArticles } from '@/lib/article-publishing';
import { countPendingReviews } from '@/lib/content-review';
import {
  IconGenre,
  IconArtist,
  IconAlbum,
  IconArchitect,
  IconArticle,
  IconPath,
  IconPlus,
  IconReview,
} from '@/components/admin/Icons';

export const dynamic = 'force-dynamic';

const HEALTH_LIMIT = 6;

/**
 * The dashboard has three jobs:
 *   1. Tell the editor what changed recently (counts + "this month")
 *   2. Point out things that need attention (content-health)
 *   3. Show what's scheduled to go live soon
 *
 * Everything here is derived from the DB on every request (force-dynamic),
 * so as soon as a cover image is uploaded or an article is published the
 * cards update without manual refresh. Queries stay cheap: six `count()`s
 * and a handful of `findMany({ take: HEALTH_LIMIT })` calls for previews.
 */
async function getDashboard() {
  // Promote anything whose scheduled time has passed, before we read — so
  // the editor never sees "scheduled" next to a date that's already in the
  // past on the dashboard.
  await publishDueArticles();

  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    genres,
    artists,
    albums,
    architects,
    articles,
    listeningPaths,
    users,
    publishedArticles,
    draftArticles,
    scheduledCount,
    // "Bu ay" counts — created in the last 30 days.
    monthArticles,
    monthArtists,
    monthAlbums,
    // Content-health counts.
    albumsWithoutCoverCount,
    artistsWithoutBioCount,
    songsWithoutLinksCount,
    articlesWithoutImageCount,
    // Previews (small).
    recentArticles,
    scheduledArticles,
    albumsWithoutCover,
    artistsWithoutBio,
    songsWithoutLinks,
    articlesWithoutImage,
  ] = await Promise.all([
    prisma.genre.count(),
    prisma.artist.count(),
    prisma.album.count(),
    prisma.architect.count(),
    prisma.article.count(),
    prisma.listeningPath.count(),
    prisma.user.count(),
    prisma.article.count({ where: { status: 'PUBLISHED' } }),
    prisma.article.count({ where: { status: 'DRAFT' } }),
    prisma.article.count({ where: { status: 'SCHEDULED' } }),
    prisma.article.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.artist.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.album.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.album.count({ where: { coverImage: null } }),
    prisma.artist.count({
      where: {
        OR: [
          { bioTr: null },
          { bioTr: '' },
          { bioEn: null },
          { bioEn: '' },
        ],
      },
    }),
    prisma.song.count({ where: { spotifyUrl: null, youtubeUrl: null } }),
    prisma.article.count({ where: { featuredImage: null } }),
    prisma.article.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: { author: { select: { name: true } } },
    }),
    prisma.article.findMany({
      where: { status: 'SCHEDULED' },
      take: 5,
      orderBy: { publishedAt: 'asc' },
      include: { author: { select: { name: true } } },
    }),
    prisma.album.findMany({
      where: { coverImage: null },
      take: HEALTH_LIMIT,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, artist: { select: { name: true } } },
    }),
    prisma.artist.findMany({
      where: {
        OR: [
          { bioTr: null },
          { bioTr: '' },
          { bioEn: null },
          { bioEn: '' },
        ],
      },
      take: HEALTH_LIMIT,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, bioTr: true, bioEn: true },
    }),
    prisma.song.findMany({
      where: { spotifyUrl: null, youtubeUrl: null },
      take: HEALTH_LIMIT,
      select: {
        id: true,
        title: true,
        album: { select: { title: true, artist: { select: { name: true } } } },
      },
    }),
    prisma.article.findMany({
      where: { featuredImage: null },
      take: HEALTH_LIMIT,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, titleTr: true, status: true },
    }),
  ]);

  return {
    counts: { genres, artists, albums, architects, articles, listeningPaths, users },
    articleCounts: {
      published: publishedArticles,
      draft: draftArticles,
      scheduled: scheduledCount,
    },
    monthCounts: {
      articles: monthArticles,
      artists: monthArtists,
      albums: monthAlbums,
    },
    healthCounts: {
      albumsWithoutCover: albumsWithoutCoverCount,
      artistsWithoutBio: artistsWithoutBioCount,
      songsWithoutLinks: songsWithoutLinksCount,
      articlesWithoutImage: articlesWithoutImageCount,
    },
    recentArticles,
    scheduledArticles,
    health: {
      albumsWithoutCover,
      artistsWithoutBio,
      songsWithoutLinks,
      articlesWithoutImage,
    },
  };
}

const statCards = [
  { key: 'articles', label: 'Makale', href: '/admin/articles', Icon: IconArticle },
  { key: 'artists', label: 'Sanatçı', href: '/admin/artists', Icon: IconArtist },
  { key: 'albums', label: 'Albüm', href: '/admin/albums', Icon: IconAlbum },
  { key: 'genres', label: 'Tür', href: '/admin/genres', Icon: IconGenre },
  { key: 'architects', label: 'Mimar', href: '/admin/architects', Icon: IconArchitect },
  { key: 'listeningPaths', label: 'Rota', href: '/admin/listening-paths', Icon: IconPath },
] as const;

function formatScheduled(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function DashboardPage() {
  const [d, session] = await Promise.all([getDashboard(), getServerSession(authOptions)]);
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === 'SUPER_ADMIN';
  // Super Admin için onay bekleyen içerik sayısı. Admin'ler bu kutuyu
  // görmez (onay kuyruğu üzerinde yetkileri yok).
  const pendingReviews = isSuperAdmin ? await countPendingReviews() : 0;

  return (
    <div className="space-y-6">
      {/* Editorial Header — "yayın evreni özeti" hissi. Eyebrow + Fraunces
          başlık + italik son-30-gün özeti (dergi künyesi dokunuşu). */}
      <div className="flex items-end justify-between gap-6 flex-wrap pb-6 border-b border-white/5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-semibold mb-2">
            Yayın Kontrol · {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1>Dashboard</h1>
          <p className="text-[13px] text-zinc-500 mt-3 italic max-w-2xl leading-relaxed">
            Son 30 günde{' '}
            <span className="text-zinc-200 font-semibold not-italic">{d.monthCounts.articles}</span> makale,{' '}
            <span className="text-zinc-200 font-semibold not-italic">{d.monthCounts.artists}</span> sanatçı,{' '}
            <span className="text-zinc-200 font-semibold not-italic">{d.monthCounts.albums}</span> albüm arşive eklendi.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/articles/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-zinc-950 text-[12px] font-semibold rounded-md hover:bg-zinc-200 transition-colors"
          >
            <IconPlus size={12} />
            Yeni Makale
          </Link>
          <Link
            href="/admin/artists/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/[0.03] border border-white/10 text-zinc-200 text-[12px] font-medium rounded-md hover:bg-white/[0.06] hover:border-white/20 hover:text-white transition-colors"
          >
            <IconPlus size={12} />
            Yeni Sanatçı
          </Link>
          <Link
            href="/admin/albums/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/[0.03] border border-white/10 text-zinc-200 text-[12px] font-medium rounded-md hover:bg-white/[0.06] hover:border-white/20 hover:text-white transition-colors"
          >
            <IconPlus size={12} />
            Yeni Albüm
          </Link>
        </div>
      </div>

      {/* Super Admin için onay bekleyen içerikler. Sayı > 0 ise amber
          tonda dikkat çeker, 0 ise sessiz "yakalandın" kutusu. Admin'ler
          bu alanı hiç görmez. */}
      {isSuperAdmin && (
        <Link
          href="/admin/reviews"
          className={
            pendingReviews > 0
              ? 'flex items-center justify-between gap-4 px-5 py-4 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/15 hover:border-amber-500/50 transition-colors group'
              : 'flex items-center justify-between gap-4 px-5 py-4 bg-zinc-900/40 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors group'
          }
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={
                pendingReviews > 0
                  ? 'w-10 h-10 rounded-md bg-amber-400 text-zinc-950 flex items-center justify-center flex-shrink-0'
                  : 'w-10 h-10 rounded-md bg-zinc-800 text-zinc-500 flex items-center justify-center flex-shrink-0'
              }
            >
              <IconReview size={18} />
            </span>
            <div className="min-w-0">
              <p
                className={
                  pendingReviews > 0
                    ? 'text-sm font-semibold text-amber-100 tracking-tight'
                    : 'text-sm font-semibold text-zinc-200 tracking-tight'
                }
              >
                {pendingReviews > 0
                  ? `${pendingReviews} içerik onayını bekliyor`
                  : 'Onay bekleyen içerik yok'}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                canPublish yetkisi olmayan editörlerin yayına gönderdiği içerikler burada listelenir.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-medium text-zinc-400 group-hover:text-white whitespace-nowrap hidden sm:inline">
            Onay Kuyruğu →
          </span>
        </Link>
      )}

      {/* Article status strip — published / scheduled / draft at a glance.
          Tek ton editoryal: renkli çerçeve/pill'lar yerine sade kartlar.
          Sadece durum adı farklı — sayı ve açıklama nötr zinc tonunda. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-900/40 rounded-lg p-4 border border-zinc-800">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Yayında</p>
          <p className="text-2xl font-semibold text-zinc-100 tracking-tight mt-1.5">{d.articleCounts.published}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">makale yayında</p>
        </div>
        <Link
          href="/admin/articles?status=SCHEDULED"
          className="bg-zinc-900/40 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-colors group"
        >
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Zamanlanmış</p>
          <p className="text-2xl font-semibold text-zinc-100 tracking-tight mt-1.5">{d.articleCounts.scheduled}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5 group-hover:text-zinc-500">yayın bekliyor</p>
        </Link>
        <div className="bg-zinc-900/40 rounded-lg p-4 border border-zinc-800">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Taslak</p>
          <p className="text-2xl font-semibold text-zinc-100 tracking-tight mt-1.5">{d.articleCounts.draft}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">taslak bekliyor</p>
        </div>
        <div className="bg-zinc-900/40 rounded-lg p-4 border border-zinc-800">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Kullanıcı</p>
          <p className="text-2xl font-semibold text-zinc-100 tracking-tight mt-1.5">{d.counts.users}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">editör hesabı</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className="group bg-zinc-900/50 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-md bg-zinc-800/80 text-zinc-400 group-hover:text-zinc-100 flex items-center justify-center transition-colors">
                <c.Icon size={16} />
              </span>
            </div>
            <p className="text-2xl font-semibold text-zinc-100 leading-tight tracking-tight">
              {d.counts[c.key]}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">{c.label}</p>
          </Link>
        ))}
      </div>

      {/* Scheduled articles — only render the card if anything is waiting.
          Tek ton zinc — "amator AI yapımı gibi" renkli vurguları kaldırıldı. */}
      {d.scheduledArticles.length > 0 && (
        <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Zamanlanmış Yayınlar</h2>
              <span className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-full px-1.5 py-0.5 font-mono">
                {d.articleCounts.scheduled}
              </span>
            </div>
            <Link
              href="/admin/articles"
              className="text-[11px] text-zinc-400 hover:text-white font-medium transition-colors"
            >
              Tümü →
            </Link>
          </div>
          <div className="divide-y divide-zinc-800">
            {d.scheduledArticles.map((a) => (
              <Link
                key={a.id}
                href={`/admin/articles/${a.id}`}
                className="px-4 py-2.5 flex items-center gap-3 hover:bg-zinc-900/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-100 truncate">{a.titleTr}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {a.author.name} · {a.category.replace(/_/g, ' ').toLowerCase()}
                  </p>
                </div>
                <span className="font-mono text-[11px] text-zinc-300 whitespace-nowrap">
                  {formatScheduled(a.publishedAt)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Content health — four columns, each is a prioritized checklist of
          things the editor should fix. Each card links items to the edit
          page so the fix is one click away. */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Eksik İçerik</h2>
          <p className="text-[11px] text-zinc-500">Hızlıca tamamlanabilecek boşluklar</p>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          <HealthCard
            title="Kapaksız Albüm"
            subtitle="coverImage boş"
            total={d.healthCounts.albumsWithoutCover}
            href="/admin/albums"
            emptyLabel="Tüm albümlerin kapağı var"
            items={d.health.albumsWithoutCover.map((a) => ({
              id: a.id,
              href: `/admin/albums/${a.id}`,
              title: a.title,
              sub: a.artist.name,
            }))}
          />
          <HealthCard
            title="Biyografisi Eksik Sanatçı"
            subtitle="bioTr veya bioEn boş"
            total={d.healthCounts.artistsWithoutBio}
            href="/admin/artists"
            emptyLabel="Tüm sanatçıların biyografisi tam"
            items={d.health.artistsWithoutBio.map((a) => {
              const missing: string[] = [];
              if (!a.bioTr) missing.push('TR');
              if (!a.bioEn) missing.push('EN');
              return {
                id: a.id,
                href: `/admin/artists/${a.id}`,
                title: a.name,
                sub: `Eksik: ${missing.join(' + ') || '—'}`,
              };
            })}
          />
          <HealthCard
            title="Linksiz Şarkı"
            subtitle="Spotify/YouTube ikisi de yok"
            total={d.healthCounts.songsWithoutLinks}
            href="/admin/songs"
            emptyLabel="Tüm şarkılarda dinleme linki var"
            items={d.health.songsWithoutLinks.map((s) => ({
              id: s.id,
              href: `/admin/songs/${s.id}`,
              title: s.title,
              sub: `${s.album.artist.name} — ${s.album.title}`,
            }))}
          />
          <HealthCard
            title="Kapaksız Makale"
            subtitle="featuredImage boş"
            total={d.healthCounts.articlesWithoutImage}
            href="/admin/articles"
            emptyLabel="Tüm makalelerin kapağı var"
            items={d.health.articlesWithoutImage.map((a) => ({
              id: a.id,
              href: `/admin/articles/${a.id}`,
              title: a.titleTr,
              sub:
                a.status === 'PUBLISHED'
                  ? 'yayında'
                  : a.status === 'SCHEDULED'
                  ? 'zamanlanmış'
                  : 'taslak',
            }))}
          />
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Son Düzenlenen Makaleler</h2>
          <Link
            href="/admin/articles"
            className="text-[11px] text-zinc-500 hover:text-zinc-100 font-medium transition-colors"
          >
            Tümü →
          </Link>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {d.recentArticles.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs text-zinc-500">Henüz makale yok</p>
              <Link
                href="/admin/articles/new"
                className="text-xs text-zinc-100 font-medium hover:underline mt-1 inline-block"
              >
                İlk makaleyi oluştur →
              </Link>
            </div>
          ) : (
            d.recentArticles.map((a) => {
              const statusLabel =
                a.status === 'PUBLISHED'
                  ? 'Yayında'
                  : a.status === 'SCHEDULED'
                    ? 'Zamanlanmış'
                    : 'Taslak';
              return (
                <Link
                  key={a.id}
                  href={`/admin/articles/${a.id}`}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-100 truncate">{a.titleTr}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {a.author.name} · {a.category.replace(/_/g, ' ').toLowerCase()}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-900/60 border border-zinc-800 text-[9px] uppercase tracking-wider font-medium text-zinc-400 whitespace-nowrap">
                    {statusLabel}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Small reusable card for the "content health" grid. Shows a count badge, a
 * scrollable list of items (each linking to its edit page), and a stable
 * empty state when the category is clean.
 */
function HealthCard({
  title,
  subtitle,
  total,
  items,
  href,
  emptyLabel,
}: {
  title: string;
  subtitle: string;
  total: number;
  items: Array<{ id: string; href: string; title: string; sub: string }>;
  href: string;
  emptyLabel: string;
}) {
  const clean = total === 0;
  return (
    <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[12px] font-semibold text-zinc-100 tracking-tight truncate">{title}</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{subtitle}</p>
        </div>
        <span className="text-[11px] font-mono font-semibold rounded-full px-2 py-0.5 whitespace-nowrap bg-zinc-900 border border-zinc-800 text-zinc-300">
          {total}
        </span>
      </div>
      {clean ? (
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
          <span className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center text-[13px]">
            ✓
          </span>
          <p className="text-[11px] text-zinc-400 mt-2">{emptyLabel}</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-zinc-800/60">
            {items.map((it) => (
              <Link
                key={it.id}
                href={it.href}
                className="px-4 py-2 block hover:bg-zinc-800/40 transition-colors"
              >
                <p className="text-[12px] font-medium text-zinc-100 truncate">{it.title}</p>
                <p className="text-[10px] text-zinc-500 truncate mt-0.5">{it.sub}</p>
              </Link>
            ))}
          </div>
          {total > items.length && (
            <Link
              href={href}
              className="px-4 py-2 text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 border-t border-zinc-800 transition-colors text-center"
            >
              +{total - items.length} daha →
            </Link>
          )}
        </>
      )}
    </div>
  );
}
