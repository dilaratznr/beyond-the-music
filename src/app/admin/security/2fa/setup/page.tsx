/**
 * 2FA setup sayfası.
 *
 * Üç state'li bir client component:
 *   1) idle      — "2FA'yı kur" butonu, henüz QR yok
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
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold text-zinc-100 mb-2">İki Adımlı Doğrulama (2FA)</h1>
      <p className="text-sm text-zinc-400 mb-8">
        Hesabını telefondaki bir Authenticator uygulamasıyla (Google Authenticator,
        Authy, 1Password) ek bir koda bağla. Şifren çalınsa bile kimse hesabına giremez.
      </p>

      {error && (
        <div role="alert" className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-md">
          {error}
        </div>
      )}

      {state.kind === 'idle' && (
        <button
          onClick={startSetup}
          disabled={busy}
          className="px-5 py-2.5 bg-white text-zinc-950 rounded-md text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {busy ? 'Hazırlanıyor...' : '2FA\u2019yı Etkinleştir'}
        </button>
      )}

      {state.kind === 'qr' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">1. QR kodu tara</h2>
            <p className="text-xs text-zinc-500 mb-4">
              {'Authenticator uygulamasını aç → \u201c+\u201d → QR kod tara.'}
            </p>
            <div className="bg-white p-4 rounded-lg inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={state.qrDataUrl} alt="2FA QR kod" width={256} height={256} />
            </div>
            <details className="mt-3 text-xs text-zinc-500">
              <summary className="cursor-pointer hover:text-zinc-300">QR kodu tarayamıyorsan elle gir</summary>
              <code className="block mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 break-all">
                {state.otpauthUrl}
              </code>
            </details>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">2. Uygulamadaki kodu gir</h2>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-48 px-3.5 py-2.5 text-center text-lg tracking-[0.5em] bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 focus:border-zinc-500 outline-none"
            />
            <button
              onClick={verify}
              disabled={busy || code.length !== 6}
              className="ml-3 px-5 py-2.5 bg-white text-zinc-950 rounded-md text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              {busy ? 'Doğrulanıyor...' : 'Doğrula'}
            </button>
          </div>
        </div>
      )}

      {state.kind === 'success' && (
        <div>
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm rounded-md">
            {'✓ 2FA aktif. Bundan sonra her login\u2019de bir kod isteyeceğiz.'}
          </div>

          <h2 className="text-sm font-semibold text-zinc-300 mb-2">Yedek kodlar — şimdi kaydet!</h2>
          <p className="text-xs text-zinc-500 mb-4">
            Telefonunu kaybedersen bu kodlardan biriyle giriş yapabilirsin. Her kod
            <strong className="text-zinc-300"> sadece bir kez</strong> çalışır. Bu sayfa kapandığında
            kodlar bir daha gösterilmez. <strong className="text-zinc-300">Şimdi kopyala / yazdır.</strong>
          </p>

          <div className="grid grid-cols-2 gap-2 p-4 bg-zinc-950 border border-zinc-800 rounded-md font-mono text-sm">
            {state.backupCodes.map((c) => (
              <div key={c} className="text-zinc-300 select-all">{c}</div>
            ))}
          </div>

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
            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm rounded-md transition-colors"
          >
            .txt olarak indir
          </button>

          <Link
            href="/admin/dashboard"
            className="ml-3 inline-block mt-4 px-4 py-2 bg-white text-zinc-950 text-sm font-semibold rounded-md hover:bg-zinc-200 transition-colors"
          >
            {'Dashboard\u2019a dön'}
          </Link>
        </div>
      )}
    </div>
  );
}
