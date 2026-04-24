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

/**
 * Davet akışı (Dilara geri bildirimi: "super admin'in admin şifresini
 * belirlemesi profesyonel değil"). Yeni kullanıcı oluştururken şifre
 * alanı yok — backend random placeholder set ediyor ve mustSetPassword
 * bayrağıyla login'i blokluyor. Oluşturma başarılı olunca backend
 * davet URL'ini dönüyor; email gönderildiyse sadece onay gösteriyoruz,
 * gönderilmediyse linki modal'da copy-paste ile Super Admin'e sunuyoruz.
 */

interface InviteResponse {
  user: { id: string; email: string; name: string };
  invite: {
    url: string;
    expiresAt: string;
    emailSent: boolean;
    emailError?: string;
  };
}

export default function NewUserPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [form, setForm] = useState<{ name: string; email: string; role: Role }>({
    name: '', email: '', role: 'EDITOR',
  });
  const [permissions, setPermissions] = useState<Record<string, PermState>>(buildInitialPermissions());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState<InviteResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  useEffect(() => {
    if (status === 'loading') return;
    if (!isSuperAdmin) router.replace('/admin/dashboard');
  }, [status, isSuperAdmin, router]);

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
      setInvite(data as InviteResponse);
      toast(
        (data as InviteResponse).invite.emailSent
          ? 'Kullanıcı oluşturuldu, davet email olarak gönderildi'
          : 'Kullanıcı oluşturuldu — daveti manuel iletmen gerekiyor',
      );
    }
  }

  async function copyInviteUrl() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.invite.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Link kopyalanamadı, elle seç', 'error');
    }
  }

  if (status === 'loading' || !isSuperAdmin) {
    return <InlineLoading />;
  }

  // Başarı sonrası davet sonuç ekranı
  if (invite) {
    return (
      <div className="max-w-2xl">
        <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
          <Link href="/admin/users" className="hover:text-zinc-100 transition-colors">
            Kullanıcılar
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-300 font-medium">Davet Gönderildi</span>
        </nav>

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            {invite.invite.emailSent ? 'Davet Email Gönderildi' : 'Davet Oluşturuldu'}
          </h1>
          <p className="text-[13px] text-zinc-500 mt-1">
            <span className="text-zinc-300 font-medium">{invite.user.name}</span> ·{' '}
            <span className="font-mono">{invite.user.email}</span>
          </p>
        </div>

        {invite.invite.emailSent ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg mb-4">
            <p className="text-sm text-emerald-300">
              Davet linki <span className="font-medium">{invite.user.email}</span> adresine
              gönderildi. Link 48 saat geçerlidir.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-4 space-y-2">
            <p className="text-sm text-amber-300 font-medium">
              Email gönderilemedi — SMTP yapılandırılmamış.
            </p>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              Aşağıdaki linki kopyalayıp kullanıcıya manuel ilet. Link 48 saat geçerli.
              Prod&apos;da SMTP kurarsan bu adım otomatikleşir.
            </p>
          </div>
        )}

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 space-y-2">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
            Davet Linki
          </label>
          <div className="flex items-stretch gap-2">
            <input
              type="text"
              readOnly
              value={invite.invite.url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 px-3 py-2 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 outline-none"
            />
            <button
              type="button"
              onClick={copyInviteUrl}
              className="px-3 py-2 bg-white text-zinc-950 text-xs font-semibold rounded-md hover:bg-zinc-200 transition-colors whitespace-nowrap"
            >
              {copied ? 'Kopyalandı' : 'Kopyala'}
            </button>
          </div>
          <p className="text-[10px] text-zinc-500">
            Kullanıcı bu linke tıklayınca kendi şifresini belirler ve hesabı aktifleşir.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-6">
          <button
            type="button"
            onClick={() => {
              setInvite(null);
              setForm({ name: '', email: '', role: 'EDITOR' });
              setPermissions(buildInitialPermissions());
            }}
            className="px-4 py-2.5 text-sm text-zinc-300 hover:text-zinc-100 font-medium transition-colors"
          >
            Başka Kullanıcı Oluştur
          </button>
          <Link
            href="/admin/users"
            className="px-5 py-2.5 bg-white text-zinc-950 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors shadow-sm"
          >
            Kullanıcı Listesine Dön
          </Link>
        </div>
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
        <span className="text-zinc-300 font-medium">Yeni Kullanıcı</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Yeni Kullanıcı</h1>
        <p className="text-[13px] text-zinc-500 mt-0.5">
          Yeni bir admin veya editör hesabı oluşturun ve bölüm bazlı yetki verin. Kullanıcı
          kendi şifresini davet linkinden belirleyecek.
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
              E-posta benzersiz olmalı. Bu adrese 48 saat geçerli davet linki gönderilir.
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

            {/* Şifre yok artık — açıklayıcı bilgi kutusu */}
            <div className="flex items-start gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-md">
              <span className="flex-shrink-0 w-6 h-6 rounded bg-zinc-800 text-zinc-400 flex items-center justify-center text-[11px] font-semibold mt-0.5">
                ✓
              </span>
              <div className="text-[11px] text-zinc-400 leading-relaxed">
                <p className="text-zinc-200 font-semibold mb-0.5">
                  Şifreyi kullanıcı kendisi belirler
                </p>
                <p>
                  Bu e-postaya <strong className="text-zinc-300">48 saat geçerli</strong> bir
                  davet linki gönderilir. Kullanıcı linke tıklayıp kendi şifresini belirleyince
                  hesabı aktifleşir. SMTP ayarlanmamışsa link sana gösterilir ve manuel
                  iletirsin.
                </p>
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
            {loading ? 'Davet gönderiliyor…' : 'Davet Gönder'}
          </button>
        </div>
      </form>
    </div>
  );
}
