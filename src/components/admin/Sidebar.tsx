'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, ComponentType } from 'react';
import { signOut, useSession } from 'next-auth/react';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import {
  IconDashboard,
  IconGenre,
  IconArtist,
  IconAlbum,
  IconSong,
  IconArchitect,
  IconArticle,
  IconPath,
  IconUsers,
  IconVideo,
  IconSettings,
  IconExternal,
  IconLogout,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconStar,
  IconUpload,
  IconReview,
  IconAudit,
} from './Icons';

type IconComp = ComponentType<{ size?: number; className?: string }>;

interface UserPerms {
  role: string;
  name: string;
  username?: string;
  email?: string | null;
  isSuperAdmin: boolean;
  sections: Record<string, { canCreate: boolean; canEdit: boolean; canDelete: boolean; canPublish: boolean }>;
}

// Rol → kullanıcıya gösterilen TR etiket
const ROLE_LABEL_TR: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  EDITOR: 'Editor',
};

const contentItems: { href: string; label: string; icon: IconComp; section: string }[] = [
  { href: '/admin/genres', label: 'Türler', icon: IconGenre, section: 'GENRE' },
  { href: '/admin/artists', label: 'Sanatçılar', icon: IconArtist, section: 'ARTIST' },
  { href: '/admin/albums', label: 'Albümler', icon: IconAlbum, section: 'ALBUM' },
  { href: '/admin/songs', label: 'Şarkılar', icon: IconSong, section: 'ALBUM' },
  { href: '/admin/architects', label: 'Mimarlar', icon: IconArchitect, section: 'ARCHITECT' },
  { href: '/admin/articles', label: 'Makaleler', icon: IconArticle, section: 'ARTICLE' },
  { href: '/admin/listening-paths', label: 'Dinleme Rotaları', icon: IconPath, section: 'LISTENING_PATH' },
];

// EDITOR + ADMIN + SUPER_ADMIN görmeli — /admin/featured'ın API'si
// EDITOR+ icin açık, ama eskiden sadece SUPER_ADMIN managementItems
// bloğunda gözüküyordu → editörler link'i göremiyordu. Ayrı bir
// "kürasyon" bloğuna alındı.
const curationItems: { href: string; label: string; icon: IconComp }[] = [
  { href: '/admin/featured', label: 'Öne Çıkarılanlar', icon: IconStar },
];

const managementItems: { href: string; label: string; icon: IconComp }[] = [
  { href: '/admin/import', label: 'İçe Aktar', icon: IconUpload },
  { href: '/admin/users', label: 'Kullanıcılar', icon: IconUsers },
  { href: '/admin/audit', label: 'Denetim Kayıtları', icon: IconAudit },
  { href: '/admin/hero-videos', label: 'Hero Videoları', icon: IconVideo },
  { href: '/admin/settings', label: 'Site Ayarları', icon: IconSettings },
];

function NavLink({
  href,
  label,
  Icon,
  active,
  collapsed,
  badge,
}: {
  href: string;
  label: string;
  Icon: IconComp;
  active: boolean;
  collapsed: boolean;
  /** Opsiyonel sayısal badge (örn. bekleyen onay adedi). 0 veya yoksa basılmaz. */
  badge?: number;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-all',
        active
          ? 'bg-zinc-800/80 text-white font-medium'
          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
      )}
    >
      {/* subtle active indicator */}
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-white" aria-hidden />
      )}
      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 relative">
        <Icon size={15} />
        {collapsed && badge && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-amber-400 text-zinc-950 text-[9px] font-bold flex items-center justify-center leading-none">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      {!collapsed && <span className="truncate flex-1">{label}</span>}
      {!collapsed && badge && badge > 0 && (
        <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-amber-400 text-zinc-950 text-[10px] font-bold flex items-center justify-center leading-none">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  // SWR ile /api/users/me — UsersPage ve diğer admin sayfalarıyla dedupe
  // edilir. Tab focus'ta otomatik revalidate, navigasyon arası anında render.
  const { data: perms } = useSWR<UserPerms>('/api/users/me');

  // Pending reviews count — Super Admin için badge.
  const isSuperAdminNow = perms?.isSuperAdmin || perms?.role === 'SUPER_ADMIN';
  const {
    data: reviewsCountData,
    mutate: mutateReviewsCount,
  } = useSWR<{ count: number }>(
    isSuperAdminNow ? '/api/admin/reviews/count?status=PENDING' : null,
    {
      // Her 60sn'de bir auto-refresh — biri yeni review submit ederse görünür.
      refreshInterval: 60_000,
    },
  );
  const pendingReviews = reviewsCountData?.count ?? 0;

  // Reviews page approve/reject sonrası yayınlanan custom event — count'u
  // anında güncellemek için manuel mutate tetikler.
  useEffect(() => {
    const onReviewChange = () => mutateReviewsCount();
    window.addEventListener('btm:reviews-changed', onReviewChange);
    return () => window.removeEventListener('btm:reviews-changed', onReviewChange);
  }, [mutateReviewsCount]);

  // Reviews sayfasına girdiğinde count'u taze çek.
  useEffect(() => {
    if (!isSuperAdminNow) return;
    if (pathname.startsWith('/admin/reviews')) mutateReviewsCount();
  }, [pathname, isSuperAdminNow, mutateReviewsCount]);

  // Keyboard shortcut: ⌘\ (macOS) / Ctrl+\ (Linux/Win) toggles the sidebar —
  // skipped when focus is inside a text input so typing a backslash still works.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '\\' || !(e.metaKey || e.ctrlKey)) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      const editable = tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable;
      if (editable) return;
      e.preventDefault();
      setCollapsed((c) => !c);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const visible = contentItems.filter((item) => {
    if (!perms) return true;
    if (perms.isSuperAdmin) return true;
    const sec = perms.sections[item.section];
    return sec && (sec.canCreate || sec.canEdit || sec.canDelete || sec.canPublish);
  });

  const isSuperAdmin = perms?.isSuperAdmin || perms?.role === 'SUPER_ADMIN';

  return (
    <aside
      className={cn(
        'relative bg-zinc-950 text-zinc-100 flex flex-col transition-[width] duration-200 flex-shrink-0 sticky top-0 h-screen self-start border-r border-zinc-900',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Brand — küçük Fraunces "B" markası + editoryel "Beyond" kelimesi.
          Public site'daki hero mantığıyla konuşsun: admin bir yönetim
          paneli ama aynı yayının back-office'i. */}
      <div className="h-14 px-4 border-b border-zinc-900 flex items-center gap-2.5">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5 min-w-0 text-white">
          <span className="flex-shrink-0 w-7 h-7 rounded-md bg-gradient-to-br from-white/10 to-white/5 ring-1 ring-white/10 flex items-center justify-center font-editorial font-bold text-[13px] leading-none">
            B
          </span>
          {!collapsed && (
            <span className="flex flex-col leading-none">
              <span className="font-editorial text-[14px] text-white tracking-tight">Beyond</span>
              {/* Logo altındaki etiket kullanıcının role'üne göre dinamik:
                  SUPER_ADMIN → "Super Admin", ADMIN → "Admin", EDITOR → "Editor".
                  Login yokken / yüklenirken default "Editor" gösterir. */}
              <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 mt-0.5">
                {perms?.role === 'SUPER_ADMIN'
                  ? 'Super Admin'
                  : perms?.role === 'ADMIN'
                    ? 'Admin'
                    : 'Editor'}
              </span>
            </span>
          )}
        </Link>
      </div>

      {/* Floating collapse handle — sits on the sidebar's outer edge so the
          hit area is obvious and doesn't eat into the brand row. */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
        title={collapsed ? 'Menüyü genişlet (⌘\\)' : 'Menüyü daralt (⌘\\)'}
        className="absolute top-[52px] -right-3 z-20 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600 shadow-lg transition-colors"
      >
        {collapsed ? <IconChevronRight size={12} /> : <IconChevronLeft size={12} />}
      </button>

      {/* Quick actions: search trigger (⌘K) + new article. When the sidebar
          is collapsed the row shrinks to two icon-only buttons. */}
      {collapsed ? (
        <div className="p-2 space-y-2.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('btm:open-palette'))}
            title="Ara (⌘K)"
            aria-label="Ara"
            className="flex items-center justify-center w-full h-8 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
          <Link
            href="/admin/articles/new"
            title="Yeni Makale"
            className="flex items-center justify-center w-full h-8 rounded-md bg-white text-zinc-900 hover:bg-zinc-200 transition-colors"
          >
            <IconPlus size={14} />
          </Link>
        </div>
      ) : (
        <div className="p-3 space-y-2.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('btm:open-palette'))}
            className="group flex items-center gap-2 w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-700 rounded-md transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <span className="text-[12px] flex-1 text-left">Ara…</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-mono text-zinc-500 border border-zinc-700 bg-zinc-800/60 rounded px-1 py-0.5 group-hover:border-zinc-600">
              ⌘K
            </kbd>
          </button>
          <Link
            href="/admin/articles/new"
            className="flex items-center justify-center gap-1.5 w-full px-3 py-1.5 bg-white text-zinc-900 text-[12px] font-semibold rounded-md hover:bg-zinc-200 transition-colors"
          >
            <IconPlus size={13} />
            <span>Yeni Makale</span>
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 pb-2 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="mb-1">
          <NavLink
            href="/admin/dashboard"
            label="Dashboard"
            Icon={IconDashboard}
            active={pathname === '/admin/dashboard'}
            collapsed={collapsed}
          />
        </div>

        {!collapsed && (
          <p className="px-2.5 pt-4 pb-1 text-[10px] text-zinc-600 uppercase tracking-[0.12em] font-semibold">
            İçerik
          </p>
        )}
        <div className="space-y-0.5">
          {visible.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.icon}
              active={pathname.startsWith(item.href)}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* Kürasyon — her rol (EDITOR+) görür. Featured gibi içerik
            ediyoryal seçimleri buraya girer. */}
        {!collapsed && (
          <p className="px-2.5 pt-4 pb-1 text-[10px] text-zinc-600 uppercase tracking-[0.12em] font-semibold">
            Kürasyon
          </p>
        )}
        <div className="space-y-0.5">
          {curationItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.icon}
              active={pathname.startsWith(item.href)}
              collapsed={collapsed}
            />
          ))}
        </div>

        {isSuperAdmin && (
          <>
            {!collapsed && (
              <p className="px-2.5 pt-4 pb-1 text-[10px] text-zinc-600 uppercase tracking-[0.12em] font-semibold">
                Yönetim
              </p>
            )}
            <div className="space-y-0.5">
              {/* Onay Bekleyenler — bekleyen onay varsa amber badge ile
                  belirginleşir. Yönetimin en üst satırı çünkü Super
                  Admin'in güncel olarak haberdar olmasını istediğimiz
                  iş burası. */}
              <NavLink
                href="/admin/reviews"
                label="Onay Bekleyenler"
                Icon={IconReview}
                active={pathname.startsWith('/admin/reviews')}
                collapsed={collapsed}
                badge={pendingReviews}
              />
              {managementItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  Icon={item.icon}
                  active={pathname.startsWith(item.href)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Footer: user + actions */}
      <div className="p-2.5 border-t border-zinc-900 space-y-1.5">
        {/* Kullanıcı bilgisi: önce perms (`/api/users/me`)'den, yoksa
            session'dan oku — session NextAuth'un client tarafındaki
            populate'ine bağımlı, perms direct fetch ile daha hızlı geliyor.
            İkisi de yoksa hiç render etme (login öncesi loading state). */}
        {(() => {
          const displayName = perms?.name ?? session?.user?.name ?? null;
          const displayUsername = perms?.username ?? null;
          const displayEmail =
            perms?.email ??
            (session?.user as { email?: string } | undefined)?.email ??
            null;
          const displayRole =
            perms?.role ??
            (session?.user as { role?: string } | undefined)?.role ??
            null;
          // Sub-line: tercihen username, yoksa email
          const subLine = displayUsername ?? displayEmail ?? null;
          if (!displayName && !subLine) return null;

          const initial = (displayName ?? subLine ?? '?').charAt(0).toUpperCase();
          const roleLabel = displayRole ? ROLE_LABEL_TR[displayRole] ?? displayRole : null;

          if (collapsed) {
            // Daraltılmış: sadece avatar dairesi, hover'da rol tooltip.
            return (
              <div
                title={`${displayName ?? subLine}${roleLabel ? ` · ${roleLabel}` : ''}`}
                className="flex items-center justify-center px-1.5 py-1.5"
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white',
                    isSuperAdmin
                      ? 'bg-gradient-to-br from-zinc-700 to-zinc-900 ring-1 ring-white/10'
                      : 'bg-zinc-800 ring-1 ring-white/5',
                  )}
                >
                  {initial}
                </div>
              </div>
            );
          }

          // Profil bloğu artık tıklanabilir — kendi hesap güvenlik
          // sayfasına (2FA aç/kapa, yedek kodları yenile) götürür. Eski
          // sürümde bu link yoktu, kullanıcı 2FA'sını kapatamıyordu.
          return (
            <Link
              href="/admin/security/2fa/setup"
              title="Hesap güvenliği (2FA)"
              className="flex items-center gap-2.5 px-1.5 py-2 rounded-md bg-zinc-900/40 border border-zinc-800/60 hover:bg-zinc-900/70 hover:border-zinc-700 transition-colors group"
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0 text-white',
                  isSuperAdmin
                    ? 'bg-gradient-to-br from-zinc-700 to-zinc-900 ring-1 ring-white/10'
                    : 'bg-zinc-800 ring-1 ring-white/5',
                )}
                aria-hidden="true"
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-zinc-100 truncate leading-tight">
                  {displayName ?? subLine}
                </p>
                {displayUsername && (
                  <p className="text-[10px] font-mono text-zinc-500 truncate leading-tight mt-0.5">
                    @{displayUsername}
                  </p>
                )}
                {roleLabel && (
                  <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500 mt-0.5 font-medium">
                    {roleLabel}
                  </p>
                )}
              </div>
              <span className="text-zinc-600 group-hover:text-zinc-400 text-xs flex-shrink-0 transition-colors">
                ⚙
              </span>
            </Link>
          );
        })()}
        <div className="flex gap-1">
          <Link
            href="/tr"
            title="Siteyi Gör"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-md transition-colors"
          >
            <IconExternal size={12} />
            {!collapsed && <span>Siteyi Gör</span>}
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            title="Çıkış"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
          >
            <IconLogout size={12} />
            {!collapsed && <span>Çıkış</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
