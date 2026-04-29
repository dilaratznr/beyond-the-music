/**
 * 2FA setup sayfası.
 *
 * Üç state'li bir client component:
 *   1) idle      — şık card layout: ikon + 3 adım önizlemesi + büyük buton
 *   2) qr        — QR kod gösterilir + 6 haneli kod input'u
 *   3) success   — 10 backup kodu gösterilir (TEK SEFER)
 *
 * Bütün API çağrıları same-origin fetch — middleware'deki CSRF Origin
 * check'inden geçer.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';

type State =
  | { kind: 'idle' }
  | { kind: 'qr'; qrDataUrl: string; otpauthUrl: string }
  | { kind: 'success'; backupCodes: string[] }
  // 2FA zaten aktif → "yönet" görünümü: disable + regenerate-codes butonları
  | { kind: 'manage' }
  // Manage'te disable code input açıldı → kapatma için TOTP/backup bekliyor
  | { kind: 'disabling' };

interface MeResponse {
  twoFactorEnabled?: boolean;
  twoFactorEnabledAt?: string | null;
}

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Onboarding modu: ilk login'de buraya yönlendiren cookie var.
  // Bu modda "Şimdi atla" butonu görünür; ayarlardan açıkça gelindiğinde
  // (onboarding=1 yok) atlama butonu gizli, sadece kurulum akışı.
  const isOnboarding = searchParams.get('onboarding') === '1';

  const [state, setState] = useState<State>({ kind: 'idle' });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Kullanıcının 2FA durumu — Sidebar zaten /api/users/me'yi çekiyor,
  // burada SWR cache hit ediyoruz. enabled ise idle yerine manage göster.
  const { data: me, mutate: mutateMe } = useSWR<MeResponse>('/api/users/me', {
    fetcher: (url) => fetch(url).then((r) => r.json()),
  });

  useEffect(() => {
    if (state.kind === 'idle' && me?.twoFactorEnabled && !isOnboarding) {
      setState({ kind: 'manage' });
    }
    // Onboarding state'inde manage'a düşmek istemiyoruz — yeni kullanıcı
    // zaten 2FA aktif değil, idle akışına devam etsin.
  }, [me, state.kind, isOnboarding]);

  async function skipSetup() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/2fa/skip', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Atlanamadı');
      }
      // Pending JWT artık tam JWT — middleware enroll yönlendirmesi yapmıyor.
      router.push('/admin/dashboard');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
      setBusy(false);
    }
  }

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup başlatılamadı');
      setState({ kind: 'qr', qrDataUrl: data.qrDataUrl, otpauthUrl: data.otpauthUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (state.kind !== 'qr') return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Doğrulama başarısız');
      setState({ kind: 'success', backupCodes: data.backupCodes });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setBusy(false);
    }
  }

  async function disable2fa() {
    if (state.kind !== 'disabling') return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kapatılamadı');
      setCode('');
      setInfo('İki adımlı doğrulama kapatıldı.');
      // SWR'da cache'i taze tut, Sidebar / AdminAuthGate güncel state alsın.
      await mutateMe();
      setState({ kind: 'idle' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setBusy(false);
    }
  }

  async function regenerateCodes() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/admin/2fa/regenerate-codes', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yedek kodlar yenilenemedi');
      // Yedek kodları success ekranıyla göster — kullanıcı SADECE şimdi
      // görür; sayfayı kapatınca DB'de hash kaydı kalır, ham kodlar gider.
      setState({ kind: 'success', backupCodes: data.backupCodes });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-7rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        {error && (
          <div role="alert" className="mb-4 p-3 bg-zinc-900/60 border border-zinc-800 border-l-2 border-l-rose-400 text-zinc-200 text-sm rounded-md">
            {error}
          </div>
        )}

        {/* ───────────── IDLE ───────────── */}
        {state.kind === 'idle' && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 backdrop-blur-sm">
            {/* Shield ikon — security/2FA görsel kimliği */}
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-semibold text-zinc-100 text-center tracking-tight mb-2">
              İki Adımlı Doğrulama
            </h1>
            <p className="text-sm text-zinc-400 text-center mb-8 leading-relaxed">
              Hesabını telefondaki bir Authenticator uygulamasıyla ek bir koda bağla.
              <br />
              Şifren çalınsa bile kimse hesabına giremez.
            </p>

            {/* Üç adım preview — kullanıcı ne olacağını önceden görsün */}
            <div className="space-y-3 mb-8">
              {[
                { n: 1, t: 'QR kodu tara', d: 'Google Authenticator, Authy ya da 1Password ile' },
                { n: 2, t: 'Uygulamadaki 6 haneli kodu gir', d: 'Bağlantıyı doğrulamak için' },
                { n: 3, t: '10 yedek kodu kaydet', d: 'Telefon kaybında giriş için tek kullanımlık' },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/60">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold flex items-center justify-center">
                    {s.n}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100 leading-tight">{s.t}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={startSetup}
              disabled={busy}
              className="w-full py-3 bg-white text-zinc-950 rounded-lg text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              {busy ? 'Hazırlanıyor…' : 'Kuruluma Başla'}
            </button>

            {isOnboarding && (
              <button
                onClick={skipSetup}
                disabled={busy}
                className="w-full mt-2 py-2.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 rounded-lg disabled:opacity-50 transition-colors"
              >
                Şimdi atla, sonra ayarlardan kurarım
              </button>
            )}

            <p className="text-[11px] text-zinc-600 text-center mt-4 leading-relaxed">
              {isOnboarding
                ? 'Şiddetle önerilir — şifren çalınsa bile hesabın güvende kalır. Atladığında istediğin zaman ayarlardan açabilirsin.'
                : 'Kurulum 1 dakikadan az sürer. İstediğin zaman ayarlardan değiştirebilirsin.'}
            </p>
          </div>
        )}

        {/* ───────────── QR ───────────── */}
        {state.kind === 'qr' && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight mb-1">
              QR kodunu tara, kodu gir
            </h1>
            <p className="text-xs text-zinc-500 mb-6">
              {'Authenticator app → \u201c+\u201d → QR kod tara → ekrandaki 6 haneli kodu aşağıya gir.'}
            </p>

            <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">
              <div className="bg-white p-3 rounded-lg inline-block w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={state.qrDataUrl} alt="2FA QR kod" width={200} height={200} />
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="totp-input" className="block text-[11px] font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                    Doğrulama kodu
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="totp-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      autoComplete="one-time-code"
                      autoFocus
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="flex-1 px-3.5 py-2.5 text-center text-lg tracking-[0.5em] bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 focus:border-emerald-500/60 outline-none"
                    />
                    <button
                      onClick={verify}
                      disabled={busy || code.length !== 6}
                      className="px-4 py-2.5 bg-white text-zinc-950 rounded-md text-sm font-semibold hover:bg-zinc-200 disabled:opacity-30 transition-colors"
                    >
                      {busy ? '…' : 'Doğrula'}
                    </button>
                  </div>
                </div>

                <details className="text-xs text-zinc-500">
                  <summary className="cursor-pointer hover:text-zinc-300 select-none">
                    {'QR\u2019ı tarayamıyorsan elle gir'}
                  </summary>
                  <code className="block mt-2 p-3 bg-zinc-950 border border-zinc-800 rounded text-zinc-400 break-all text-[11px] leading-relaxed">
                    {state.otpauthUrl}
                  </code>
                </details>
              </div>
            </div>
          </div>
        )}

        {/* ───────────── SUCCESS ───────────── */}
        {state.kind === 'success' && (
          <div className="rounded-2xl border border-emerald-500/30 bg-zinc-900/40 p-8">
            <div className="flex justify-center mb-5">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/40 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <h1 className="text-xl font-semibold text-zinc-100 text-center tracking-tight mb-1">
              2FA aktif
            </h1>
            <p className="text-sm text-zinc-400 text-center mb-7">
              {'Bundan sonra her login\u2019de doğrulama kodu isteyeceğiz.'}
            </p>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-4 mb-5">
              <p className="text-[13px] font-semibold text-amber-300 mb-1">⚠ Yedek kodları şimdi kaydet</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Telefonunu kaybedersen bu kodlardan biriyle girersin. Her kod{' '}
                <strong className="text-zinc-200">tek kullanımlık</strong>. Bu sayfa kapandığında bir daha gösterilmez —{' '}
                <strong className="text-zinc-200">indir veya yazdır</strong>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-3 bg-zinc-950 border border-zinc-800 rounded-lg font-mono text-sm">
              {state.backupCodes.map((c) => (
                <div key={c} className="text-zinc-200 select-all py-1 px-2 hover:bg-zinc-900 rounded transition-colors">
                  {c}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  const blob = new Blob(
                    [
                      'Beyond The Music — 2FA Yedek Kodları\n',
                      `Oluşturulma: ${new Date().toISOString()}\n\n`,
                      state.backupCodes.join('\n'),
                      '\n\nHer kod sadece bir kez kullanılabilir.',
                    ],
                    { type: 'text/plain' },
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'btm-2fa-backup-codes.txt';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium rounded-md transition-colors"
              >
                .txt olarak indir
              </button>
              <Link
                href="/admin/dashboard"
                className="flex-1 py-2.5 bg-white text-zinc-950 text-sm font-semibold rounded-md hover:bg-zinc-200 transition-colors text-center"
              >
                {'Dashboard\u2019a dön'}
              </Link>
            </div>
          </div>
        )}

        {/* ───────────── MANAGE (2FA aktifken görünür) ───────────── */}
        {state.kind === 'manage' && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-zinc-100 leading-tight">
                  İki Adımlı Doğrulama
                </h1>
                <p className="text-[11px] text-emerald-400 mt-0.5 font-medium uppercase tracking-wider">
                  Aktif
                  {me?.twoFactorEnabledAt && (
                    <span className="text-zinc-500 normal-case font-normal tracking-normal ml-2">
                      · {new Date(me.twoFactorEnabledAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })} tarihinden beri
                    </span>
                  )}
                </p>
              </div>
            </div>

            {info && (
              <div className="mb-5 p-3 bg-emerald-500/[0.06] border border-emerald-500/20 text-emerald-300 text-sm rounded-md">
                {info}
              </div>
            )}

            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Hesabın iki adımlı doğrulamayla korunuyor. Her login'de
              authenticator uygulamasından bir kod istenir.
            </p>

            <div className="space-y-3">
              <button
                onClick={regenerateCodes}
                disabled={busy}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 rounded-lg text-left text-sm transition-colors disabled:opacity-50"
              >
                <span>
                  <span className="block text-zinc-100 font-medium">Yedek kodları yenile</span>
                  <span className="block text-[11px] text-zinc-500 mt-0.5">Eskileri geçersiz olur, yeni 10 kod üretilir</span>
                </span>
                <span className="text-zinc-500 text-xs">→</span>
              </button>

              <button
                onClick={() => {
                  setCode('');
                  setError(null);
                  setInfo(null);
                  setState({ kind: 'disabling' });
                }}
                disabled={busy}
                className="w-full flex items-center justify-between px-4 py-3 bg-rose-500/[0.04] border border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/[0.08] rounded-lg text-left text-sm transition-colors disabled:opacity-50"
              >
                <span>
                  <span className="block text-rose-200 font-medium">İki adımlı doğrulamayı kapat</span>
                  <span className="block text-[11px] text-rose-300/60 mt-0.5">Hesap güvenliğin azalır — sadece şifreyle korunur</span>
                </span>
                <span className="text-rose-300 text-xs">→</span>
              </button>
            </div>
          </div>
        )}

        {/* ───────────── DISABLING (kapatma onayı için TOTP/backup) ───────────── */}
        {state.kind === 'disabling' && (
          <div className="rounded-2xl border border-rose-500/30 bg-zinc-900/40 p-8">
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight mb-2">
              2FA'yı kapatmak için doğrulama
            </h1>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Authenticator uygulamasındaki <strong>6 haneli kodu</strong> ya
              da yedek kodlardan birini gir. Çalınmış oturumun bunu yapmasını
              engellemek için bu adım zorunlu.
            </p>

            <div className="space-y-3">
              <input
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
                placeholder="000000 veya yedek kod"
                className="w-full px-3.5 py-2.5 text-center text-base tracking-[0.25em] bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 focus:border-rose-500/60 outline-none placeholder:tracking-normal placeholder:text-zinc-600"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCode('');
                    setError(null);
                    setState({ kind: 'manage' });
                  }}
                  disabled={busy}
                  className="flex-1 py-2.5 text-zinc-300 bg-zinc-800/60 hover:bg-zinc-800 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Vazgeç
                </button>
                <button
                  onClick={disable2fa}
                  disabled={busy || code.length < 6}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-white rounded-md text-sm font-semibold transition-colors disabled:opacity-30"
                >
                  {busy ? 'Kapatılıyor…' : 'Kapat'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
