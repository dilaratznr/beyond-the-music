'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/admin/AuthLayout';

const inputCls =
  'w-full px-3.5 py-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors hover:border-zinc-700 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setStatus('sent');
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error || 'Bir hata oluştu');
      setStatus('error');
    }
  }

  return (
    <AuthLayout
      eyebrow="Parola Sıfırlama"
      title="Unuttuk olur."
      subtitle="E-postanızı girin, hesabınıza bir sıfırlama bağlantısı gönderelim. Bağlantı 30 dakika geçerli kalır."
    >
      {status === 'sent' ? (
        <div role="status" aria-live="polite">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-5">
            <svg
              className="w-7 h-7 text-emerald-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight mb-2">
            E-postanızı kontrol edin
          </h1>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Bu adrese bağlı bir admin hesabı varsa, az önce bir sıfırlama bağlantısı gönderdik. 30
            dakika içinde link üzerinden yeni şifrenizi belirleyebilirsiniz.
          </p>
          <Link
            href="/admin/login"
            className="inline-block px-4 py-2 bg-white text-zinc-950 rounded-md text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            Giriş ekranına dön
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-7">
            <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">
              Şifremi unuttum
            </h1>
            <p className="text-sm text-zinc-500 mt-1.5">
              Hesabınıza kayıtlı e-postayı girin.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {status === 'error' && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-md"
              >
                <span className="text-red-400 leading-none mt-0.5" aria-hidden="true">
                  ●
                </span>
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="forgot-email"
                className="block text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider"
              >
                E-posta
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={200}
                placeholder="ornek@beyondthemusic.com"
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full py-2.5 bg-white text-zinc-950 rounded-md text-sm font-semibold tracking-tight hover:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === 'sending' ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span
                    className="w-3.5 h-3.5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  Gönderiliyor…
                </span>
              ) : (
                'Sıfırlama Bağlantısı Gönder'
              )}
            </button>

            <p className="text-center text-[11px] text-zinc-500 pt-2">
              <Link href="/admin/login" className="hover:text-zinc-100 transition-colors">
                ← Giriş ekranına dön
              </Link>
            </p>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
