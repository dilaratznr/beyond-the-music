import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getStats() {
  const [genres, artists, albums, architects, articles, publishedArticles, draftArticles, listeningPaths, users] = await Promise.all([
    prisma.genre.count(),
    prisma.artist.count(),
    prisma.album.count(),
    prisma.architect.count(),
    prisma.article.count(),
    prisma.article.count({ where: { status: 'PUBLISHED' } }),
    prisma.article.count({ where: { status: 'DRAFT' } }),
    prisma.listeningPath.count(),
    prisma.user.count(),
  ]);

  const recentArticles = await prisma.article.findMany({
    take: 5, orderBy: { createdAt: 'desc' },
    include: { author: { select: { name: true } } },
  });

  const recentArtists = await prisma.artist.findMany({
    take: 5, orderBy: { createdAt: 'desc' },
    include: { genres: { include: { genre: { select: { nameTr: true } } } } },
  });

  return { genres, artists, albums, architects, articles, publishedArticles, draftArticles, listeningPaths, users, recentArticles, recentArtists };
}

export default async function DashboardPage() {
  const s = await getStats();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Dashboard</h1>
          <p className="text-xs text-zinc-500">İçerik yönetim panelinize hoş geldiniz</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/articles/new" className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-800">+ Yeni Makale</Link>
          <Link href="/admin/artists/new" className="px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs font-medium rounded-lg hover:bg-zinc-200">+ Yeni Sanatçı</Link>
          <Link href="/admin/genres/new" className="px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs font-medium rounded-lg hover:bg-zinc-200">+ Yeni Tür</Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Tür', value: s.genres, href: '/admin/genres', color: 'text-blue-600 bg-blue-50' },
          { label: 'Sanatçı', value: s.artists, href: '/admin/artists', color: 'text-violet-600 bg-violet-50' },
          { label: 'Albüm', value: s.albums, href: '/admin/albums', color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Mimar', value: s.architects, href: '/admin/architects', color: 'text-amber-600 bg-amber-50' },
          { label: 'Makale', value: s.articles, href: '/admin/articles', color: 'text-red-600 bg-red-50' },
          { label: 'Rota', value: s.listeningPaths, href: '/admin/listening-paths', color: 'text-teal-600 bg-teal-50' },
        ].map((c) => (
          <Link key={c.label} href={c.href} className="bg-white rounded-xl p-4 border border-zinc-100 hover:border-zinc-200 hover:shadow-sm transition-all">
            <p className="text-2xl font-bold text-zinc-900">{c.value}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{c.label}</p>
          </Link>
        ))}
      </div>

      {/* Article stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <p className="text-lg font-bold text-emerald-700">{s.publishedArticles}</p>
          <p className="text-[11px] text-emerald-600">Yayında</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <p className="text-lg font-bold text-amber-700">{s.draftArticles}</p>
          <p className="text-[11px] text-amber-600">Taslak</p>
        </div>
        <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
          <p className="text-lg font-bold text-violet-700">{s.users}</p>
          <p className="text-[11px] text-violet-600">Kullanıcı</p>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Recent Articles */}
        <div className="bg-white rounded-xl border border-zinc-100">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Son Makaleler</h2>
            <Link href="/admin/articles" className="text-[10px] text-zinc-400 hover:text-zinc-700 font-medium">Tümü →</Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {s.recentArticles.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-zinc-400">Henüz makale yok</p>
                <Link href="/admin/articles/new" className="text-xs text-zinc-900 font-medium hover:underline mt-1 inline-block">İlk makaleyi oluştur →</Link>
              </div>
            ) : s.recentArticles.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-900 truncate">{a.titleTr}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{a.author.name} · {a.category.replace(/_/g, ' ')}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${a.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {a.status === 'PUBLISHED' ? 'Yayında' : 'Taslak'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Artists */}
        <div className="bg-white rounded-xl border border-zinc-100">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Son Sanatçılar</h2>
            <Link href="/admin/artists" className="text-[10px] text-zinc-400 hover:text-zinc-700 font-medium">Tümü →</Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {s.recentArtists.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-zinc-400">Henüz sanatçı yok</p>
                <Link href="/admin/artists/new" className="text-xs text-zinc-900 font-medium hover:underline mt-1 inline-block">İlk sanatçıyı ekle →</Link>
              </div>
            ) : s.recentArtists.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                {a.image ? (
                  <img src={a.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs flex-shrink-0">♪</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-900 truncate">{a.name}</p>
                  <p className="text-[10px] text-zinc-400">{a.genres.map((g) => g.genre.nameTr).join(', ') || '—'}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-medium bg-zinc-100 text-zinc-500">{a.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-5 bg-white rounded-xl border border-zinc-100 p-4">
        <h2 className="text-sm font-semibold text-zinc-900 mb-3">Hızlı İşlemler</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { href: '/admin/articles/new', label: 'Makale Yaz', desc: 'Yeni makale oluştur', icon: '✎' },
            { href: '/admin/artists/new', label: 'Sanatçı Ekle', desc: 'Yeni sanatçı ekle', icon: '♪' },
            { href: '/admin/genres/new', label: 'Tür Ekle', desc: 'Yeni tür oluştur', icon: '♫' },
            { href: '/admin/media', label: 'Medya Yükle', desc: 'Görsel yükle', icon: '⬡' },
          ].map((q) => (
            <Link key={q.href} href={q.href}
              className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 hover:bg-zinc-100 transition-colors group">
              <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sm shadow-sm group-hover:shadow">{q.icon}</span>
              <div>
                <p className="text-xs font-medium text-zinc-900">{q.label}</p>
                <p className="text-[10px] text-zinc-400">{q.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
