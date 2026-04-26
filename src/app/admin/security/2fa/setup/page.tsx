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

import { useState } from 'react';
import Link from 'next/link';

type State =
  | { kind: 'idle' }
  | { kind: 'qr'; qrDataUrl: string; otpauthUrl: string }
  | { kind: 'success'; backupCodes: string[] };

export default function TwoFactorSetupPage() {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-[calc(100vh-7rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        {error && (
          <div role="alert" className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-md">
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

            <p className="text-[11px] text-zinc-600 text-center mt-4 leading-relaxed">
              Kurulum 1 dakikadan az sürer. İstediğin zaman ayarlardan değiştirebilirsin.
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
      </div>
    </div>
  );
}
