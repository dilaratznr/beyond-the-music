'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/admin/Toast';
import PermissionGrid, { buildInitialPermissions, PermState } from '@/components/admin/PermissionGrid';
import RoleSelector from '@/components/admin/RoleSelector';
import { ROLE_INFO, PERMISSION_SECTIONS } from '@/lib/user-admin-constants';
import { InlineLoading } from '@/components/admin/Loading';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';

/**
 * Davet akışı: Super Admin'in başkasının şifresini belirlemesi
 * güvenlik ve süreç açısından doğru değil. Yeni kullanıcı oluştururken
 * şifre alanı yok — backend random placeholder set ediyor ve
 * `mustSetPassword` bayrağıyla login'i blokluyor. Oluşturma başarılı
 * olunca backend davet URL'ini dönüyor; email gönderildiyse onay
 * gösteriyoruz, gönderilmediyse linki copy-paste ile Super Admin'e
 * sunuyoruz.
 */

interface InviteResponse {
  user: { id: string; username: string; email: string | null; name: string };
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

  const [form, setForm] = useState<{ username: string; name: string; email: string; role: Role }>({
    username: '', name: '', email: '', role: 'EDITOR',
  });
  const [permissions, setPermissions] = useState<Record<string, PermState>>(buildInitialPermissions());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState<InviteResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmCancelRef = useRef<HTMLButtonElement | null>(null);

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  useEffect(() => {
    if (status === 'loading') return;
    if (!isSuperAdmin) router.replace('/admin/dashboard');
  }, [status, isSuperAdmin, router]);

  // Modal açıldığında focus'u "Düzenle" butonuna ver — yanlış email
  // farkındalığı için varsayılan aksiyonun "geri dön" olması güvenlik
  // odaklı UX. Enter spam'i kazara onaylamayı önler.
  useEffect(() => {
    if (showConfirm) {
      confirmCancelRef.current?.focus();
    }
  }, [showConfirm]);

  // ESC ile modal kapansın — accessibility + hızlı escape.
  useEffect(() => {
    if (!showConfirm) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowConfirm(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showConfirm]);

  /** Form submit: sadece modal açar, gerçek POST `confirmAndCreate`'de. */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    // Username, ad, rol zorunlu; email opsiyonel.
    if (!form.username.trim() || !form.name.trim() || !form.role) {
      setError('Kullanıcı adı, ad ve rol zorunludur');
      return;
    }
    if (!/^[a-z0-9_-]{3,30}$/.test(form.username.trim().toLowerCase())) {
      setError(
        'Kullanıcı adı 3-30 karakter olmalı; sadece küçük harf, rakam, _ veya -.',
      );
      return;
    }
    setShowConfirm(true);
  }

  /** Onay sonrası gerçek API çağrısı. */
  async function confirmAndCreate() {
    setShowConfirm(false);
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

    const payload = {
      username: form.username.trim().toLowerCase(),
      name: form.name,
      // Email opsiyonel — boşsa hiç gönderme (backend null'a çeviriyor zaten)
      email: form.email.trim() || undefined,
      role: form.role,
      permissions: form.role !== 'SUPER_ADMIN' ? permData : undefined,
    };
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

  /**
   * Aktif (enabled) permission satırlarını insan-okur formatla özetle.
   * Onay modalında Super Admin "ne göndereceğim?" sorusuna net cevap
   * görsün — section listesi + her birinin C/E/D/P özet bayrakları.
   */
  function summarizeActivePermissions() {
    return PERMISSION_SECTIONS.map((s) => {
      const p = permissions[s.key];
      if (!p?.enabled) return null;
      const flags: string[] = [];
      if (p.canCreate) flags.push('C');
      if (p.canEdit) flags.push('E');
      if (p.canDelete) flags.push('D');
      if (p.canPublish) flags.push('P');
      return {
        key: s.key,
        label: s.labelTr,
        icon: s.icon,
        flags: flags.length ? flags.join('/') : '—',
      };
    }).filter(Boolean) as Array<{ key: string; label: string; icon: string; flags: string }>;
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
            <span className="font-mono">{invite.user.username}</span>
            {invite.user.email && (
              <>
                {' · '}
                <span className="font-mono">{invite.user.email}</span>
              </>
            )}
          </p>
        </div>

        {invite.invite.emailSent && invite.user.email ? (
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg mb-4">
            <p className="flex items-center gap-2 text-sm text-zinc-200">
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"
                aria-hidden="true"
              />
              Davet linki <span className="font-medium text-zinc-100">{invite.user.email}</span>{' '}
              adresine gönderildi. Link 48 saat geçerlidir.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg mb-4 space-y-2">
            <p className="flex items-center gap-2 text-sm text-zinc-200 font-medium">
              <span
                className="w-1.5 h-1.5 rounded-full bg-zinc-400 flex-shrink-0"
                aria-hidden="true"
              />
              Davet linki hazır — kullanıcıya manuel ilet.
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Aşağıdaki linki kopyala, kullanıcıya güvenli kanaldan (Signal /
              WhatsApp / Slack) gönder. Link 48 saat geçerli.
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
              setForm({ username: '', name: '', email: '', role: 'EDITOR' });
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
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Kullanıcı adı zorunlu (login için). E-posta opsiyonel — verirsen davet linki
              maile gider, vermezsen linki sen güvenli kanaldan iletirsin.
            </p>
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
                <label htmlFor="user-username" className="block text-xs font-medium text-zinc-100 mb-1.5">
                  Kullanıcı Adı <span className="text-zinc-500">*</span>
                </label>
                <input
                  id="user-username"
                  type="text"
                  value={form.username}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      // Anında lowercase + sadece izinli karakterler
                      username: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_-]/g, ''),
                    })
                  }
                  className="w-full px-3 py-2.5 text-sm bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg focus:ring-2 focus:ring-zinc-500/20 outline-none text-zinc-100 placeholder:text-zinc-600 font-mono"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-z0-9_-]{3,30}"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="ornek: ahmet_yilmaz"
                  aria-describedby="user-username-hint"
                />
                <p id="user-username-hint" className="text-[10px] text-zinc-500 mt-1">
                  3–30 karakter; küçük harf, rakam, _ veya -.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="user-email" className="block text-xs font-medium text-zinc-100 mb-1.5">
                E-posta <span className="text-zinc-600 font-normal">(opsiyonel)</span>
              </label>
              <input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg focus:ring-2 focus:ring-zinc-500/20 outline-none text-zinc-100 placeholder:text-zinc-600"
                autoComplete="off"
                placeholder="ornek@beyondthemusic.com"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                Boş bırakılırsa davet linki sana gösterilir, kullanıcıya manuel iletirsin.
              </p>
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
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-300">
            <p className="font-semibold text-zinc-100 mb-1">Super Admin seçildi</p>
            <p className="text-[11px] leading-relaxed text-zinc-400">
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

      {/* Onay modalı — submit'ten önce email + rol + permissions özetini
          gösterip Super Admin'in sanity check yapmasını zorlar. Yanlış
          email yazma riski'ne karşı son savunma katmanı; "İptal" cancel
          ref ile autofocus'lu (yanlışlıkla Enter'la onaylama riski azalır). */}
      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-desc"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            // Backdrop tıklamasında kapat (modal içi tıklamalar yutulur).
            if (e.target === e.currentTarget) setShowConfirm(false);
          }}
        >
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-800">
              <h2
                id="confirm-title"
                className="text-base font-semibold text-zinc-100 tracking-tight"
              >
                Daveti onayla
              </h2>
              <p id="confirm-desc" className="text-[12px] text-zinc-500 mt-1 leading-relaxed">
                Bu adrese 48 saat geçerli bir davet linki gönderilecek. E-posta adresini
                kontrol et — yanlış adrese gönderilmiş bir davet, üçüncü bir kişinin admin
                olmasıyla sonuçlanabilir.
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* En kritik bilgi: kullanıcı adı (login identifier) — vurgulu göster. */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">
                  Kullanıcı adı (login için)
                </div>
                <div
                  className="font-mono text-sm text-zinc-100 break-all select-all"
                  data-testid="confirm-username"
                >
                  {form.username}
                </div>
              </div>

              {form.email && (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">
                    E-posta
                  </div>
                  <div className="font-mono text-sm text-zinc-200 break-all select-all">
                    {form.email}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1.5">
                    Davet linki bu adrese gönderilecek.
                  </p>
                </div>
              )}
              {!form.email && (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-3">
                  <p className="text-[12px] text-zinc-400">
                    E-posta verilmedi → davet linki sana gösterilecek; güvenli kanaldan
                    (Signal / WhatsApp) kullanıcıya ileteceksin.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">
                    Ad Soyad
                  </div>
                  <div className="text-sm text-zinc-100">{form.name}</div>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">
                    Rol
                  </div>
                  <div className="text-sm text-zinc-100">
                    {ROLE_INFO[form.role]?.labelTr ?? form.role}
                  </div>
                </div>
              </div>

              {/* Permissions özeti — sadece SUPER_ADMIN dışında anlamlı. */}
              {form.role !== 'SUPER_ADMIN' && (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-2">
                    Yetkiler
                  </div>
                  {(() => {
                    const summary = summarizeActivePermissions();
                    if (summary.length === 0) {
                      return (
                        <p className="text-[12px] text-zinc-400">
                          Hiçbir bölüm seçilmedi — kullanıcı admin paneline girebilir
                          ama hiçbir bölümü göremez.
                        </p>
                      );
                    }
                    return (
                      <ul className="space-y-1">
                        {summary.map((s) => (
                          <li
                            key={s.key}
                            className="flex items-center justify-between text-[12px]"
                          >
                            <span className="text-zinc-200">
                              <span
                                className="text-zinc-500 mr-1.5"
                                aria-hidden="true"
                              >
                                {s.icon}
                              </span>
                              {s.label}
                            </span>
                            <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                              {s.flags}
                            </span>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              )}
              {form.role === 'SUPER_ADMIN' && (
                <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-[12px] text-amber-200/90 leading-relaxed">
                    <strong className="font-semibold">Super Admin</strong> rolü tüm
                    yetkilere ve kullanıcı yönetimine erişim verir. Sadece güvendiğin
                    biri olduğundan emin ol.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-zinc-900/30 border-t border-zinc-800 flex items-center justify-end gap-3">
              <button
                ref={confirmCancelRef}
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm text-zinc-200 hover:text-zinc-50 hover:bg-zinc-800 rounded-md font-medium transition-colors"
              >
                Düzenle
              </button>
              <button
                type="button"
                onClick={confirmAndCreate}
                className="px-5 py-2 bg-white text-zinc-950 rounded-md text-sm font-semibold hover:bg-zinc-200 transition-colors shadow-sm"
              >
                Onayla ve Davet Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
