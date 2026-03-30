'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

interface UserPerms {
  role: string;
  name: string;
  isSuperAdmin: boolean;
  sections: Record<string, { canCreate: boolean; canEdit: boolean; canDelete: boolean; canPublish: boolean }>;
}

const contentItems = [
  { href: '/admin/genres', label: 'Türler', icon: '♫', section: 'GENRE' },
  { href: '/admin/artists', label: 'Sanatçılar', icon: '♪', section: 'ARTIST' },
  { href: '/admin/albums', label: 'Albümler', icon: '◉', section: 'ALBUM' },
  { href: '/admin/architects', label: 'Mimarlar', icon: '⚙', section: 'ARCHITECT' },
  { href: '/admin/articles', label: 'Makaleler', icon: '✎', section: 'ARTICLE' },
  { href: '/admin/listening-paths', label: 'Dinleme Rotaları', icon: '⟡', section: 'LISTENING_PATH' },
  { href: '/admin/media', label: 'Medya', icon: '⬡', section: 'MEDIA' },
];

const managementItems = [
  { href: '/admin/users', label: 'Kullanıcılar', icon: '⊕' },
  { href: '/admin/hero-videos', label: 'Hero Videoları', icon: '▶' },
  { href: '/admin/settings', label: 'Site Ayarları', icon: '⚙' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [perms, setPerms] = useState<UserPerms | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch('/api/users/me').then((r) => r.json()).then((d) => { if (d.sections) setPerms(d); });
  }, []);

  const visible = contentItems.filter((item) => {
    if (!perms) return true;
    if (perms.isSuperAdmin) return true;
    const sec = perms.sections[item.section];
    return sec && (sec.canCreate || sec.canEdit || sec.canDelete || sec.canPublish);
  });

  const isSuperAdmin = perms?.isSuperAdmin || perms?.role === 'SUPER_ADMIN';

  function NavLink({ href, label, icon, active, accent }: { href: string; label: string; icon: string; active: boolean; accent?: boolean }) {
    return (
      <Link href={href}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all',
          active
            ? accent ? 'bg-violet-500/10 text-violet-400 font-medium' : 'bg-white/10 text-white font-medium'
            : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
        )}>
        <span className="w-5 text-center text-sm opacity-70">{icon}</span>
        {!collapsed && label}
      </Link>
    );
  }

  return (
    <aside className={cn('bg-zinc-900 text-white flex flex-col transition-all duration-200 flex-shrink-0', collapsed ? 'w-16' : 'w-56')}>
      {/* Logo */}
      <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
        <Link href="/admin/dashboard" className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">🎧</span>
          {!collapsed && <span className="font-bold text-sm truncate">BTM Admin</span>}
        </Link>
        <button onClick={() => setCollapsed(!collapsed)} className="text-zinc-600 hover:text-zinc-300 text-xs flex-shrink-0">
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Quick actions */}
      {!collapsed && (
        <div className="p-3 border-b border-zinc-800/50">
          <Link href="/admin/articles/new"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-lg transition-colors">
            + Yeni Makale
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {/* Dashboard */}
        <div className="mb-1">
          <NavLink href="/admin/dashboard" label="Dashboard" icon="▣" active={pathname === '/admin/dashboard'} />
        </div>

        {/* Content */}
        {!collapsed && <p className="px-3 pt-4 pb-1 text-[9px] text-zinc-700 uppercase tracking-[0.15em] font-bold">İçerik</p>}
        <div className="space-y-0.5">
          {visible.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={pathname.startsWith(item.href)} />
          ))}
        </div>

        {/* Management */}
        {isSuperAdmin && (
          <>
            {!collapsed && <p className="px-3 pt-5 pb-1 text-[9px] text-zinc-700 uppercase tracking-[0.15em] font-bold">Yönetim</p>}
            <div className="space-y-0.5">
              {managementItems.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={pathname.startsWith(item.href)} accent />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* User info & footer */}
      <div className="p-3 border-t border-zinc-800/50 space-y-2">
        {!collapsed && session?.user && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0',
              isSuperAdmin ? 'bg-violet-600' : 'bg-zinc-600')}>
              {session.user.name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{session.user.name}</p>
              <p className="text-[9px] text-zinc-600 truncate">{(session.user as {role:string}).role?.replace('_', ' ')}</p>
            </div>
          </div>
        )}
        <div className="flex gap-1">
          <Link href="/tr" className={cn('flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-zinc-600 hover:text-zinc-300 bg-white/5 rounded-md transition-colors', collapsed && 'px-0')}>
            {collapsed ? '↗' : '↗ Siteyi Gör'}
          </Link>
          <button onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className={cn('flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-zinc-600 hover:text-red-400 bg-white/5 rounded-md transition-colors', collapsed && 'px-0')}>
            {collapsed ? '⏻' : '⏻ Çıkış'}
          </button>
        </div>
      </div>
    </aside>
  );
}
