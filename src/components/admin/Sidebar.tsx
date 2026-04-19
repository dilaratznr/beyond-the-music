'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, ComponentType } from 'react';
import { signOut, useSession } from 'next-auth/react';
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
  IconHeadphones,
  IconPlus,
  IconStar,
  IconUpload,
} from './Icons';

type IconComp = ComponentType<{ size?: number; className?: string }>;

interface UserPerms {
  role: string;
  name: string;
  isSuperAdmin: boolean;
  sections: Record<string, { canCreate: boolean; canEdit: boolean; canDelete: boolean; canPublish: boolean }>;
}

const contentItems: { href: string; label: string; icon: IconComp; section: string }[] = [
  { href: '/admin/genres', label: 'Türler', icon: IconGenre, section: 'GENRE' },
  { href: '/admin/artists', label: 'Sanatçılar', icon: IconArtist, section: 'ARTIST' },
  { href: '/admin/albums', label: 'Albümler', icon: IconAlbum, section: 'ALBUM' },
  { href: '/admin/songs', label: 'Şarkılar', icon: IconSong, section: 'ALBUM' },
  { href: '/admin/architects', label: 'Mimarlar', icon: IconArchitect, section: 'ARCHITECT' },
  { href: '/admin/articles', label: 'Makaleler', icon: IconArticle, section: 'ARTICLE' },
  { href: '/admin/listening-paths', label: 'Dinleme Rotaları', icon: IconPath, section: 'LISTENING_PATH' },
];

const managementItems: { href: string; label: string; icon: IconComp }[] = [
  { href: '/admin/featured', label: 'Öne Çıkarılanlar', icon: IconStar },
  { href: '/admin/import', label: 'İçe Aktar', icon: IconUpload },
  { href: '/admin/users', label: 'Kullanıcılar', icon: IconUsers },
  { href: '/admin/hero-videos', label: 'Hero Videoları', icon: IconVideo },
  { href: '/admin/settings', label: 'Site Ayarları', icon: IconSettings },
];

function NavLink({
  href,
  label,
  Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  Icon: IconComp;
  active: boolean;
  collapsed: boolean;
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
      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
        <Icon size={15} />
      </span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [perms, setPerms] = useState<UserPerms | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.sections) setPerms(d);
      });
  }, []);

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
      {/* Brand */}
      <div className="h-14 px-3 border-b border-zinc-900 flex items-center gap-2">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5 min-w-0 text-white">
          <span className="flex-shrink-0 w-7 h-7 rounded-md bg-gradient-to-br from-white/10 to-white/5 ring-1 ring-white/10 flex items-center justify-center">
            <IconHeadphones size={15} />
          </span>
          {!collapsed && (
            <span className="font-semibold text-[13px] tracking-tight truncate">BTM Admin</span>
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
        <div className="p-2 space-y-1.5">
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
        <div className="p-3 space-y-1.5">
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

        {isSuperAdmin && (
          <>
            {!collapsed && (
              <p className="px-2.5 pt-4 pb-1 text-[10px] text-zinc-600 uppercase tracking-[0.12em] font-semibold">
                Yönetim
              </p>
            )}
            <div className="space-y-0.5">
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
        {!collapsed && session?.user && (
          <div className="flex items-center gap-2 px-1.5 py-1.5 rounded-md">
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 text-white',
                isSuperAdmin
                  ? 'bg-gradient-to-br from-zinc-700 to-zinc-900 ring-1 ring-white/10'
                  : 'bg-zinc-800 ring-1 ring-white/5'
              )}
            >
              {session.user.name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-zinc-100 truncate leading-tight">
                {session.user.name}
              </p>
              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                {(session.user as { role: string }).role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        )}
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
