'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/admin/Toast';
import PermissionGrid, { buildInitialPermissions, PermState } from '@/components/admin/PermissionGrid';
import RoleSelector from '@/components/admin/RoleSelector';
import { ROLE_INFO } from '@/lib/user-admin-constants';
import { InlineLoading } from '@/components/admin/Loading';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';

interface ApiPermission {
  section: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
}

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  permissions?: ApiPermission[];
}

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [user, setUser] = useState<ApiUser | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; role: Role; password: string }>({
    name: '', email: '', role: 'EDITOR', password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, PermState>>(buildInitialPermissions());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const editingSelf = currentUserId === id;

  useEffect(() => {
    if (status === 'loading') return;
    if (!isSuperAdmin) router.replace('/admin/dashboard');
  }, [status, isSuperAdmin, router]);

  useEffect(() => {
    if (!isSuperAdmin || !id) return;
    fetch(`/api/users/${id}`).then((r) => r.json()).then((data: ApiUser & { error?: string }) => {
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      setUser(data);
      setForm({ name: data.name, email: data.email, role: data.role, password: '' });
      const next = buildInitialPermissions();
      for (const p of data.permissions || []) {
        next[p.section] = {
          enabled: true,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
          canPublish: p.canPublish,
        };
      }
      setPermissions(next);
      setLoading(false);
    });
  }, [id, isSuperAdmin]);

  const roleChanged = useMemo(() => user && form.role !== user.role, [user, form.role]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const permData = Object.entries(permissions)
      .filter(([, v]) => v.enabled)
      .map(([section, v]) => ({
        section,
        canCreate: v.canCreate,
        canEdit: v.canEdit,
        canDelete: v.canDelete,
        canPublish: v.canPublish,
      }));

    const body: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      role: form.role,
      permissions: form.role !== 'SUPER_ADMIN' ? permData : undefined,
    };
    if (form.password) body.password = form.password;

    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || 'Kayıt başarısız');
      toast(data.error || 'Hata', 'error');
    } else {
      toast('Değişiklikler kaydedildi');
      router.push('/admin/users');
    }
  }

  if (status === 'loading' || !isSuperAdmin || loading) {
    return <InlineLoading />;
  }

  if (!user) {
    return (
      <div className="bg-white border border-zinc-200 rounded-xl p-10 text-center">
        <p className="text-sm font-semibold text-zinc-900">Kullanıcı bulunamadı</p>
        <p className="text-xs text-zinc-500 mt-1">Silinmiş olabilir veya URL hatalı.</p>
        <Link href="/admin/users" className="inline-block mt-4 px-4 py-2 bg-zinc-900 text-white text-xs rounded-lg hover:bg-zinc-800">
          Kullanıcılara dön
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-3" aria-label="Breadcrumb">
        <Link href="/admin/users" className="hover:text-zinc-100 transition-colors">
          Kullanıcılar
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-300 font-medium truncate max-w-[240px]">{user.name}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Kullanıcıyı Düzenle</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            {user.email} · {ROLE_INFO[user.role]?.labelTr} · {user.isActive ? 'Aktif' : 'Pasif'}
          </p>
        </div>
        {editingSelf && (
          <div className="shrink-0 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] rounded-lg">
            Kendi hesabınızı düzenliyorsunuz — rolünüzü düşüremezsiniz.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <section className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
          <header className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/60">
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Temel Bilgiler</h2>
          </header>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="user-name" className="block text-xs font-medium text-zinc-100 mb-1.5">
                  Ad Soyad <span className="text-red-500">*</span>
                </label>
                <input
                  id="user-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg focus:ring-2 focus:ring-zinc-500/20 outline-none text-zinc-100 placeholder:text-zinc-600"
                  required
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="user-email" className="block text-xs font-medium text-zinc-100 mb-1.5">
                  E-posta <span className="text-red-500">*</span>
                </label>
                <input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg focus:ring-2 focus:ring-zinc-500/20 outline-none text-zinc-100 placeholder:text-zinc-600"
                  required
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label htmlFor="user-password" className="block text-xs font-medium text-zinc-100 mb-1.5">
                Yeni Şifre
                <span className="text-zinc-500 font-normal ml-2">(boş bırakırsanız mevcut şifre korunur)</span>
              </label>
              <div className="relative">
                <input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2.5 pr-16 text-sm bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg focus:ring-2 focus:ring-zinc-500/20 outline-none text-zinc-100 placeholder:text-zinc-600"
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-zinc-500 hover:text-zinc-100 px-2 py-1 rounded"
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? 'Gizle' : 'Göster'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Role */}
        <section className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
          <header className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/60 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Rol</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {ROLE_INFO[form.role]?.descriptionTr ?? 'Rol seçin'}
              </p>
            </div>
            {roleChanged && (
              <span className="shrink-0 px-2 py-1 bg-amber-500/15 text-amber-300 text-[10px] font-semibold rounded">
                Rol değişecek
              </span>
            )}
          </header>
          <div className="p-5">
            <RoleSelector
              value={form.role}
              onChange={(r) => setForm({ ...form, role: r })}
              disableSuperAdmin={editingSelf && user.role === 'SUPER_ADMIN'}
              disableSuperAdminReason="Kendi Super Admin rolünüzü düşüremezsiniz"
            />
          </div>
        </section>

        {/* Permissions */}
        {form.role !== 'SUPER_ADMIN' ? (
          <section className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
            <header className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/60">
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Bölüm Yetkileri</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Değişiklikler kaydedildiğinde mevcut yetkiler tamamen bu listeyle değiştirilir.
              </p>
            </header>
            <div className="p-5">
              <PermissionGrid value={permissions} onChange={setPermissions} />
            </div>
          </section>
        ) : (
          <section className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-4 text-xs text-violet-300">
            <p className="font-semibold mb-1">Super Admin</p>
            <p className="text-[11px] leading-relaxed">
              Bu kullanıcı tüm bölümlere erişime sahiptir; yetki matrisi gösterilmez.
            </p>
          </section>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Link
            href="/admin/users"
            className="px-4 py-2.5 text-sm text-zinc-300 hover:text-zinc-100 font-medium transition-colors"
          >
            ← Listeye dön
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-white text-zinc-950 rounded-lg text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
