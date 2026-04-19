'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/admin/Toast';
import PermissionGrid, { buildInitialPermissions, PermState } from '@/components/admin/PermissionGrid';
import RoleSelector from '@/components/admin/RoleSelector';
import { ROLE_INFO } from '@/lib/user-admin-constants';
import { InlineLoading } from '@/components/admin/Loading';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: 'Şifre girin', color: 'bg-zinc-200' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Çok zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü', 'Çok güçlü'];
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 'bg-emerald-500', 'bg-emerald-600'];
  return { score, label: labels[score], color: colors[score] };
}

export default function NewUserPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [form, setForm] = useState<{ name: string; email: string; password: string; role: Role }>({
    name: '', email: '', password: '', role: 'EDITOR',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, PermState>>(buildInitialPermissions());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  useEffect(() => {
    if (status === 'loading') return;
    if (!isSuperAdmin) router.replace('/admin/dashboard');
  }, [status, isSuperAdmin, router]);

  const strength = passwordStrength(form.password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
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

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, permissions: form.role !== 'SUPER_ADMIN' ? permData : undefined }),
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Kullanıcı oluşturulamadı');
      toast(data.error || 'Hata', 'error');
    } else {
      toast('Kullanıcı oluşturuldu');
      router.push('/admin/users');
    }
  }

  if (status === 'loading' || !isSuperAdmin) {
    return <InlineLoading />;
  }

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-3" aria-label="Breadcrumb">
        <Link href="/admin/users" className="hover:text-zinc-100 transition-colors">
          Kullanıcılar
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-300 font-medium">Yeni Kullanıcı</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Yeni Kullanıcı</h1>
        <p className="text-[13px] text-zinc-500 mt-0.5">
          Yeni bir admin veya editör hesabı oluşturun ve bölüm bazlı yetki verin.
        </p>
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
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Giriş için gerekli bilgiler. E-posta benzersiz olmalı.
            </p>
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
                Şifre <span className="text-red-500">*</span>
                <span className="text-zinc-500 font-normal ml-2">(en az 8 karakter önerilir)</span>
              </label>
              <div className="relative">
                <input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2.5 pr-16 text-sm bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg focus:ring-2 focus:ring-zinc-500/20 outline-none text-zinc-100 placeholder:text-zinc-600"
                  required
                  minLength={6}
                  autoComplete="new-password"
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
              {/* Strength meter */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${strength.color}`}
                    style={{ width: `${(strength.score / 5) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 min-w-[70px] text-right">{strength.label}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Role */}
        <section className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
          <header className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/60">
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Rol</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {form.role === 'SUPER_ADMIN'
                ? ROLE_INFO.SUPER_ADMIN.descriptionTr
                : 'Rol seçimi, altta göreceğiniz yetki matrisi ile birlikte nihai erişimi belirler.'}
            </p>
          </header>
          <div className="p-5">
            <RoleSelector value={form.role} onChange={(r) => setForm({ ...form, role: r })} />
          </div>
        </section>

        {/* Permissions */}
        {form.role !== 'SUPER_ADMIN' ? (
          <section className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
            <header className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/60">
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Bölüm Yetkileri</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Bir şablon seçin veya her bölümü manuel ayarlayın. <strong>C</strong>reate, <strong>E</strong>dit,{' '}
                <strong>D</strong>elete, <strong>P</strong>ublish.
              </p>
            </header>
            <div className="p-5">
              <PermissionGrid value={permissions} onChange={setPermissions} />
            </div>
          </section>
        ) : (
          <section className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-4 text-xs text-violet-300">
            <p className="font-semibold mb-1">Super Admin seçildi</p>
            <p className="text-[11px] leading-relaxed">
              Super Admin rolü tüm bölümlere ve yönetim ayarlarına tam erişime sahiptir; ayrı bir yetki ataması gerekmez.
            </p>
          </section>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/users"
            className="px-4 py-2.5 text-sm text-zinc-300 hover:text-zinc-100 font-medium transition-colors"
          >
            İptal
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-white text-zinc-950 rounded-lg text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? 'Oluşturuluyor…' : 'Kullanıcı Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
}
