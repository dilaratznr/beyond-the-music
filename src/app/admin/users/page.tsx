'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/admin/Toast';
import { PERMISSION_SECTIONS, ROLE_INFO } from '@/lib/user-admin-constants';
import { InlineLoading, TableSkeleton } from '@/components/admin/Loading';
import { useConfirm } from '@/components/admin/useConfirm';

interface Permission {
  section: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
}

interface User {
  id: string;
  username: string;
  email: string | null;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  permissions: Permission[];
}

type RoleFilter = 'all' | 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
type StatusFilter = 'all' | 'active' | 'inactive';

const SECTION_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_SECTIONS.map((s) => [s.key, s.labelTr]),
);

// Rol renkleri kaldırıldı (editoryal tutarlılık). Tek ton badge.
const ROLE_BADGE_CLASSNAME =
  'bg-zinc-900/60 text-zinc-300 ring-white/10';

// Avatar'lar tek ton — rol farkı metinle ayırt ediliyor (listede "Super Admin"
// etiketi zaten var). Renkli gradientler editoryal tutarlılığı bozuyordu.
const ROLE_AVATAR_CLASS = 'bg-gradient-to-br from-zinc-700 to-zinc-900 ring-1 ring-white/10';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function UsersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  // useSession() bazen stale data döndürür (ör. tarayıcı tab cache). `me`
  // /api/users/me'den taze fetch'lenir → "Siz" badge ve self-action
  // korumaları her zaman gerçek aktif kullanıcıya bağlı.
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);
  const { toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Session'dan başlangıç değeri (page yüklenirken loading skeleton'a düşmesin),
  // me yüklenince override edilir.
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
  const sessionRole = (session?.user as { role?: string } | undefined)?.role;
  const isSuperAdmin = (me?.role ?? sessionRole) === 'SUPER_ADMIN';
  const currentUserId = me?.id ?? sessionUserId;

  useEffect(() => {
    if (status === 'loading') return;
    // Session henüz oturmadıysa me'yi bekle
    if (!sessionRole && !me) return;
    if (!isSuperAdmin) router.replace('/admin/dashboard');
  }, [status, isSuperAdmin, sessionRole, me, router]);

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id) setMe({ id: data.id, role: data.role });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
        setLoading(false);
      });
  }, [isSuperAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'inactive' && u.isActive) return false;
      if (
        q &&
        !u.name.toLowerCase().includes(q) &&
        !u.username.toLowerCase().includes(q) &&
        !(u.email?.toLowerCase().includes(q) ?? false)
      )
        return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      total: users.length,
      superAdmin: users.filter((u) => u.role === 'SUPER_ADMIN').length,
      admin: users.filter((u) => u.role === 'ADMIN').length,
      editor: users.filter((u) => u.role === 'EDITOR').length,
      inactive: users.filter((u) => !u.isActive).length,
    }),
    [users],
  );

  async function toggleActive(user: User) {
    if (user.id === currentUserId) {
      toast('Kendi hesabınızı pasife alamazsınız', 'error');
      return;
    }
    const next = !user.isActive;
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: next }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: next } : u)));
      toast(next ? 'Kullanıcı aktif edildi' : 'Kullanıcı pasife alındı');
    } else {
      toast('İşlem başarısız', 'error');
    }
  }

  async function deleteUser(user: User) {
    if (user.id === currentUserId) {
      toast('Kendi hesabınızı silemezsiniz', 'error');
      return;
    }
    const ok = await confirm({
      title: 'Kullanıcı sil',
      description: `"${user.name}" kalıcı olarak silinecek.`,
      confirmLabel: 'Sil',
    });
    if (!ok) return;
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast('Kullanıcı silindi');
    } else {
      toast('Silme başarısız', 'error');
    }
  }

  function permissionSummary(u: User): string {
    if (u.role === 'SUPER_ADMIN') return 'Tüm yetkiler (Super Admin)';
    if (u.permissions.length === 0) return 'Henüz yetki verilmemiş';
    const names = u.permissions.map((p) => SECTION_LABELS[p.section] ?? p.section);
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
  }

  if (status === 'loading' || !isSuperAdmin) {
    return <InlineLoading />;
  }

  return (
    <div>
      {confirmDialog}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            Kullanıcılar & Yetkiler
          </h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Admin ve editör hesaplarını yönetin, bölüm bazlı yetkileri verin.
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-zinc-950 rounded-md text-xs font-semibold hover:bg-zinc-200 transition-colors"
        >
          + Yeni Kullanıcı
        </Link>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
        <StatCard label="Toplam" value={stats.total} />
        <StatCard label="Super Admin" value={stats.superAdmin} accent="violet" />
        <StatCard label="Admin" value={stats.admin} accent="blue" />
        <StatCard label="Editör" value={stats.editor} accent="emerald" />
        <StatCard label="Pasif" value={stats.inactive} accent="red" />
      </div>

      {/* Toolbar */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-3 mb-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex-1 relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none"
            aria-hidden="true"
          >
            ⌕
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim, kullanıcı adı veya e-posta ara…"
            aria-label="Kullanıcı ara"
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 placeholder:text-zinc-500 outline-none hover:border-zinc-600 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={roleFilter === 'all'} onClick={() => setRoleFilter('all')}>
            Tümü
          </FilterChip>
          <FilterChip
            active={roleFilter === 'SUPER_ADMIN'}
            onClick={() => setRoleFilter('SUPER_ADMIN')}
            accent="violet"
          >
            Super
          </FilterChip>
          <FilterChip
            active={roleFilter === 'ADMIN'}
            onClick={() => setRoleFilter('ADMIN')}
            accent="blue"
          >
            Admin
          </FilterChip>
          <FilterChip
            active={roleFilter === 'EDITOR'}
            onClick={() => setRoleFilter('EDITOR')}
            accent="emerald"
          >
            Editör
          </FilterChip>
        </div>
        <div className="h-5 w-px bg-zinc-800 hidden md:block" />
        <div className="flex gap-1.5">
          <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
            Aktif+Pasif
          </FilterChip>
          <FilterChip
            active={statusFilter === 'active'}
            onClick={() => setStatusFilter('active')}
            accent="emerald"
          >
            Aktif
          </FilterChip>
          <FilterChip
            active={statusFilter === 'inactive'}
            onClick={() => setStatusFilter('inactive')}
            accent="red"
          >
            Pasif
          </FilterChip>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <TableSkeleton rows={4} showHeader={false} />
      ) : filtered.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg py-16 text-center">
          <p className="text-sm text-zinc-100 font-medium">Eşleşen kullanıcı yok</p>
          <p className="text-xs text-zinc-500 mt-1">
            Aramayı veya filtreleri değiştirmeyi deneyin.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => {
            const badgeCls = ROLE_BADGE_CLASSNAME;
            const isMe = user.id === currentUserId;
            const roleInfo = ROLE_INFO[user.role];
            return (
              <div
                key={user.id}
                className="bg-zinc-900/40 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 px-4 py-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${ROLE_AVATAR_CLASS}`}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-zinc-100 truncate">
                        {user.name}
                      </span>
                      {isMe && (
                        <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 text-[10px] rounded font-semibold">
                          Siz
                        </span>
                      )}
                      {!user.isActive && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900/60 text-zinc-300 border border-zinc-800 text-[10px] rounded-full uppercase tracking-wider font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" aria-hidden="true" />
                          Pasif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">
                      <span className="font-mono">@{user.username}</span>
                      {user.email && (
                        <>
                          {' · '}
                          {user.email}
                        </>
                      )}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {permissionSummary(user)} · Kayıt: {formatDate(user.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${badgeCls}`}
                      title={roleInfo?.descriptionTr}
                    >
                      {roleInfo?.labelTr ?? user.role}
                    </span>
                    {user.role !== 'SUPER_ADMIN' ? (
                      <div className="flex gap-1">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="px-2.5 py-1 bg-zinc-900 text-zinc-300 text-[11px] rounded-md hover:bg-zinc-800 hover:text-white font-medium transition-colors border border-zinc-800"
                        >
                          Düzenle
                        </Link>
                        <button
                          onClick={() => toggleActive(user)}
                          disabled={isMe}
                          className="px-2.5 py-1 text-[11px] rounded-md font-medium border bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {user.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                        </button>
                        <button
                          onClick={() => deleteUser(user)}
                          disabled={isMe}
                          className="px-2.5 py-1 bg-zinc-900 text-zinc-300 text-[11px] rounded-md hover:border-zinc-700 hover:bg-zinc-800 hover:text-white font-medium transition-colors border border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Sil
                        </button>
                      </div>
                    ) : (
                      <span className="px-2 py-1 text-[10px] text-zinc-500 italic">
                        Korumalı hesap
                      </span>
                    )}
                  </div>
                </div>
                {user.role !== 'SUPER_ADMIN' && user.permissions.length > 0 && (
                  <div className="border-t border-zinc-800 px-4 py-2">
                    <button
                      onClick={() =>
                        setExpandedUser(expandedUser === user.id ? null : user.id)
                      }
                      className="text-[11px] text-zinc-500 hover:text-zinc-100 flex items-center gap-1.5 transition-colors"
                      aria-expanded={expandedUser === user.id}
                    >
                      <span className="text-[10px]">
                        {expandedUser === user.id ? '▼' : '▶'}
                      </span>
                      Yetki detaylarını göster ({user.permissions.length} bölüm)
                    </button>
                    {expandedUser === user.id && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 pb-2">
                        {PERMISSION_SECTIONS.map((sec) => {
                          const perm = user.permissions.find((p) => p.section === sec.key);
                          // Yetkili/yetkisiz ayrımı — border yerine sadece
                          // text opacity ile yapılıyor. Yığın halinde
                          // renkli çerçeveler göz yoruyordu; section adı
                          // zaten "bu kullanıcı ne yönetebiliyor" sorusuna
                          // cevap veriyor, vurguya gerek yok.
                          return (
                            <div
                              key={sec.key}
                              className={`flex items-center justify-between gap-2 px-3 py-2 text-xs ${
                                perm ? 'text-zinc-200' : 'text-zinc-600'
                              }`}
                            >
                              <span className="font-medium truncate">
                                <span className={`mr-1.5 ${perm ? 'text-zinc-500' : 'text-zinc-700'}`}>
                                  {sec.icon}
                                </span>
                                {sec.labelTr}
                              </span>
                              {perm && (
                                <span className="flex gap-0.5 flex-shrink-0" aria-label="Yetkiler">
                                  {perm.canCreate && <PermBadge>C</PermBadge>}
                                  {perm.canEdit && <PermBadge>E</PermBadge>}
                                  {perm.canDelete && <PermBadge>D</PermBadge>}
                                  {perm.canPublish && <PermBadge>P</PermBadge>}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Accent renkleri kaldırıldı — editoryal tek ton. Sayı zaten büyük,
// label zaten uppercase — vurgu için rengi gereksiz.
function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
  /** Geriye uyumlu — artık yok sayılıyor, tek ton. */
  accent?: 'violet' | 'blue' | 'emerald' | 'red';
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
        {label}
      </div>
      <div className="text-xl font-semibold mt-0.5 tracking-tight text-zinc-100">
        {value}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** Geriye uyumlu — accent artık yok, sadece active/inactive tonu. */
  accent?: 'violet' | 'blue' | 'emerald' | 'red';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
        active
          ? 'bg-white text-zinc-950 border-white'
          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}

function PermBadge({
  children,
}: {
  children: React.ReactNode;
  /** Geriye uyumlu — color artık yok, hep tek ton. */
  color?: 'emerald' | 'blue' | 'red' | 'violet';
}) {
  // Tek renk, düşük kontrast — C/E/D/P harfleri kart içinde
  // "burada bir yetki var" sinyali vermek için yeterince görünür,
  // ama göz yormayacak kadar sessiz.
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm text-[9px] font-semibold bg-zinc-800/70 text-zinc-400 ring-1 ring-inset ring-zinc-700/40">
      {children}
    </span>
  );
}
