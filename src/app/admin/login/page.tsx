'use client';

import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout from '@/components/admin/AuthLayout';

const inputCls =
  'w-full px-3.5 py-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors hover:border-zinc-700 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('/admin/dashboard');
  const router = useRouter();

  // `useSearchParams()` yerine window.location — Suspense boundary'e
  // ihtiyaç kalmıyor, böylece Vercel preview URL'lerinde hidrasyon
  // "Yükleniyor…" fallback'inde takılıp kalmıyor.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const cb = params.get('callbackUrl');
      if (cb) setCallbackUrl(cb);
    } catch {
      /* noop — malformed URL */
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      setLoading(false);

      if (!result) {
        setError('Sunucuya ulaşılamadı — bağlantıyı kontrol edip tekrar deneyin.');
        return;
      }

      if (result.error) {
        // CredentialsSignin = yanlış bilgi. CallbackRouteError / diğer = sunucu hatası.
        setError(
          result.error === 'CredentialsSignin'
            ? 'E-posta veya şifre hatalı.'
            : `Giriş başarısız: ${result.error}`,
        );
        return;
      }

      if (!result.ok) {
        setError('Giriş isteği reddedildi.');
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(`Beklenmeyen hata: ${msg}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-md"
        >
          <span className="text-red-400 leading-none mt-0.5" aria-hidden="true">
            ●
          </span>
          <span>{error}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="admin-login-email"
          className="block text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider"
        >
          E-posta
        </label>
        <input
          id="admin-login-email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@beyondthemusic.com"
          className={inputCls}
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="admin-login-password"
            className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider"
          >
            Şifre
          </label>
          <Link
            href="/admin/forgot-password"
            className="text-[11px] text-zinc-500 hover:text-zinc-100 transition-colors"
          >
            Şifremi unuttum
          </Link>
        </div>
        <div className="relative">
          <input
            id="admin-login-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={`${inputCls} pr-16`}
            required
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
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-white text-zinc-950 rounded-md text-sm font-semibold tracking-tight hover:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <span
              className="w-3.5 h-3.5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin"
              aria-hidden="true"
            />
            Giriş yapılıyor…
          </span>
        ) : (
          'Giriş Yap'
        )}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <AuthLayout eyebrow="Admin Console" title="Müziğin ötesindeki kültürü yönet.">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">
          Tekrar hoş geldiniz
        </h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          Yönetim paneline erişmek için giriş yapın.
        </p>
      </div>

      <LoginForm />

      <p className="mt-7 pt-5 border-t border-zinc-800 text-[11px] text-zinc-500 text-center leading-relaxed">
        Hesabınız mı yok? Yeni hesaplar yalnızca{' '}
        <span className="font-semibold text-zinc-300">Super Admin</span> tarafından oluşturulabilir.
      </p>
    </AuthLayout>
  );
}
