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
  const [form, setForm] = useState<{ name: string; email: string; role: Role }>({
    name: '', email: '', role: 'EDITOR',
  });
  const [permissions, setPermissions] = useState<Record<string, PermState>>(buildInitialPermissions());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Davet linkini yeniden göndermek için — resend-invite API'si hem
  // email'i tetikler, hem de SMTP yoksa response'ta linki döndürür.
  const [invitingId, setInvitingId] = useState(false);
  const [resendResult, setResendResult] = useState<{
    url: string;
    emailSent: boolean;
    emailError?: string;
  } | null>(null);
  const [resendCopied, setResendCopied] = useState(false);

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
      setForm({ name: data.name, email: data.email, role: data.role });
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

    // Şifre artık formda yok — super admin başka kullanıcının şifresini
    // belirlemez. Değiştirmek isterse "Davet Linkini Yeniden Gönder"
    // butonuyla kullanıcıya yeni şifre belirleme linki yollanır.
    const body: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      role: form.role,
      permissions: form.role !== 'SUPER_ADMIN' ? permData : undefined,
    };

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
          <div className="shrink-0 px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-[11px] rounded-lg">
            Kendi hesabınızı düzenliyorsunuz — rolünüzü düşüremezsiniz.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 p-3 bg-zinc-900/60 border border-zinc-800 text-zinc-200 text-sm rounded-lg"
          >
            <span
              className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0"
              aria-hidden="true"
            />
            <span>{error}</span>
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
                  Ad Soyad <span className="text-zinc-500">*</span>
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
                  E-posta <span className="text-zinc-500">*</span>
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

          </div>
        </section>

        {/* Hesap erişimi — şifreyi kullanıcı kendi belirler. Super Admin
            ancak yeni bir davet/reset linki üretebilir; kimsenin şifresini
            elle koyamaz. */}
        <section className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
          <header className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/60">
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Hesap Erişimi</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Şifre belirleme ve sıfırlama için davet linki gönder. Super Admin kullanıcının şifresini
              doğrudan belirleyemez — güvenlik için herkes kendi şifresinden sorumludur.
            </p>
          </header>
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm text-zinc-200">
                  {user.isActive
                    ? 'Kullanıcıya 48 saat geçerli yeni bir şifre belirleme linki gönder.'
                    : 'Hesap devre dışı olduğundan davet gönderilemez.'}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Gönderildiğinde mevcut tüm aktif davet linkleri iptal olur.
                </p>
              </div>
              <button
                type="button"
                disabled={!user.isActive || invitingId}
                onClick={async () => {
                  setInvitingId(true);
                  setResendResult(null);
                  try {
                    const res = await fetch(`/api/users/${id}/resend-invite`, { method: 'POST' });
                    const data = await res.json();
                    if (!res.ok) {
                      toast(data.error || 'Davet gönderilemedi', 'error');
                    } else {
                      setResendResult(data.invite);
                      toast(
                        data.invite.emailSent
                          ? 'Davet email olarak gönderildi'
                          : 'Davet oluşturuldu — linki manuel ilet',
                      );
                    }
                  } finally {
                    setInvitingId(false);
                  }
                }}
                className="shrink-0 px-4 py-2 bg-white text-zinc-950 text-xs font-semibold rounded-md hover:bg-zinc-200 disabled:opacity-50 transition-colors"
              >
                {invitingId ? 'Gönderiliyor…' : 'Davet Linki Yeniden Gönder'}
              </button>
            </div>

            {resendResult && (
              <div className="p-4 rounded-md border bg-zinc-900/60 border-zinc-800">
                {resendResult.emailSent ? (
                  <p className="flex items-center gap-2 text-sm text-zinc-200">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"
                      aria-hidden="true"
                    />
                    Link <span className="font-medium text-zinc-100">{user.email}</span> adresine
                    gönderildi.
                  </p>
                ) : (
                  <>
                    <p className="flex items-center gap-2 text-sm text-zinc-200 font-medium mb-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-zinc-400 flex-shrink-0"
                        aria-hidden="true"
                      />
                      Davet linki hazır — kullanıcıya manuel ilet.
                    </p>
                    <p className="text-[11px] text-zinc-500 mb-3">
                      Aşağıdaki linki kopyala, kullanıcıya güvenli kanaldan
                      (Signal / WhatsApp / Slack) gönder. Link 48 saat geçerli.
                    </p>
                  </>
                )}
                <div className="flex items-stretch gap-2">
                  <input
                    type="text"
                    readOnly
                    value={resendResult.url}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(resendResult.url);
                        setResendCopied(true);
                        setTimeout(() => setResendCopied(false), 2000);
                      } catch {
                        toast('Link kopyalanamadı', 'error');
                      }
                    }}
                    className="px-3 py-2 bg-white text-zinc-950 text-xs font-semibold rounded-md hover:bg-zinc-200 transition-colors whitespace-nowrap"
                  >
                    {resendCopied ? 'Kopyalandı' : 'Kopyala'}
                  </button>
                </div>
              </div>
            )}
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
              <span className="inline-flex items-center gap-1.5 shrink-0 px-2 py-1 bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-[10px] font-semibold rounded uppercase tracking-wider">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-amber-400"
                  aria-hidden="true"
                />
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
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-300">
            <p className="font-semibold text-zinc-100 mb-1">Super Admin</p>
            <p className="text-[11px] leading-relaxed text-zinc-400">
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
