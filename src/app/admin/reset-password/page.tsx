'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout from '@/components/admin/AuthLayout';

const inputCls =
  'w-full px-3.5 py-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors hover:border-zinc-700 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20';

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: 'Şifre girin', color: 'bg-zinc-800' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Çok zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü', 'Çok güçlü'];
  const colors = [
    'bg-zinc-700',
    'bg-zinc-600',
    'bg-zinc-500',
    'bg-zinc-400',
    'bg-zinc-300',
    'bg-white',
  ];
  return { score, label: labels[score], color: colors[score] };
}

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const strength = passwordStrength(password);

  if (!token) {
    return (
      <div role="alert">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-5">
          <svg
            className="w-7 h-7 text-red-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.732-3L13.732 4a2 2 0 00-3.464 0L3.268 16A2 2 0 005 19z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight mb-2">
          Bağlantı geçersiz
        </h1>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          Bu sıfırlama bağlantısı eksik veya bozuk. Yeni bir bağlantı talep edin.
        </p>
        <Link
          href="/admin/forgot-password"
          className="inline-block px-4 py-2 bg-white text-zinc-950 rounded-md text-sm font-semibold hover:bg-zinc-200 transition-colors"
        >
          Yeni bağlantı iste
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirm) {
      setErrorMsg('Şifreler eşleşmiyor');
      setStatus('error');
      return;
    }

    setStatus('submitting');

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    if (res.ok) {
      setStatus('done');
      setTimeout(() => {
        router.push('/admin/login');
      }, 1800);
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error || 'Şifre güncellenemedi');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div role="status" aria-live="polite">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-5">
          <svg
            className="w-7 h-7 text-emerald-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight mb-2">
          Şifre güncellendi
        </h1>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          Giriş ekranına yönlendiriliyorsunuz…
        </p>
        <Link
          href="/admin/login"
          className="inline-block px-4 py-2 bg-white text-zinc-950 rounded-md text-sm font-semibold hover:bg-zinc-200 transition-colors"
        >
          Giriş Yap
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">
          Yeni şifre belirleyin
        </h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          Admin hesabınız için güçlü bir şifre seçin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {status === 'error' && errorMsg && (
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
            htmlFor="reset-password"
            className="block text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider"
          >
            Yeni Şifre
          </label>
          <div className="relative">
            <input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={200}
              aria-describedby="reset-password-hint"
              className={`${inputCls} pr-16`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 px-2 py-1 rounded transition-colors"
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              tabIndex={-1}
            >
              {showPassword ? 'Gizle' : 'Göster'}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${strength.color}`}
                style={{ width: `${(strength.score / 5) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500 min-w-[70px] text-right">
              {strength.label}
            </span>
          </div>
          <p id="reset-password-hint" className="text-[11px] text-zinc-500 mt-1.5">
            En az 8 karakter, harf ve rakam içermeli.
          </p>
        </div>

        <div>
          <label
            htmlFor="reset-password-confirm"
            className="block text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider"
          >
            Şifre Tekrar
          </label>
          <input
            id="reset-password-confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            maxLength={200}
            className={inputCls}
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full py-2.5 bg-white text-zinc-950 rounded-md text-sm font-semibold tracking-tight hover:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === 'submitting' ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span
                className="w-3.5 h-3.5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin"
                aria-hidden="true"
              />
              Güncelleniyor…
            </span>
          ) : (
            'Şifreyi Güncelle'
          )}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      eyebrow="Parola Sıfırlama"
      title="Güvenli bir adım daha."
      subtitle="Yeni şifrenizi belirleyin. Tahmin edilmesi zor, başka hiçbir yerde kullanmadığınız bir şifre önerilir."
    >
      <Suspense
        fallback={<div className="text-center text-sm text-zinc-500 py-8">Yükleniyor…</div>}
      >
        <ResetForm />
      </Suspense>
    </AuthLayout>
  );
}
