/**
 * Admin login — Server Component + Server Action.
 *
 * Neden client component değil: /admin/login'de React hidrasyonu bazı
 * ağlarda / Vercel Deployment Protection'ın araya girdiği durumlarda
 * çalışmıyordu — form native POST ile gitmeye çalışıp credentials'ları
 * URL'ye döküyor, hiçbir hata da görünmüyordu. Server Action kullanınca
 * form JavaScript'e hiç ihtiyaç duymadan çalışıyor: tarayıcı direkt
 * POST atar, Next.js sunucuda action'u çalıştırır, session cookie'sini
 * kurup dashboard'a redirect eder.
 *
 * NextAuth'un /api/auth/callback/credentials akışı yerine burada
 * doğrudan `next-auth/jwt` encode'ları ile aynı formatta session
 * cookie'si kuruyoruz — siteneki diğer sayfalar (middleware, session
 * okuyan API'ler) aynen NextAuth'u kullandığı için değişiklik gerektirmiyor.
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import bcrypt from 'bcryptjs';
import { encode } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import AuthLayout from '@/components/admin/AuthLayout';

const inputCls =
  'w-full px-3.5 py-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors hover:border-zinc-700 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20';

// NextAuth v4 — HTTPS deployments (Vercel dahil) __Secure- öneki kullanır.
function getCookieName() {
  const useSecure =
    process.env.NEXTAUTH_URL?.startsWith('https://') ||
    process.env.VERCEL === '1';
  return useSecure
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';
}

async function loginAction(formData: FormData) {
  'use server';

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const callbackUrl = String(formData.get('callbackUrl') ?? '/admin/dashboard');

  if (!email || !password) {
    redirect('/admin/login?error=missing');
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    // Env variable'ı unutulmuşsa kullanıcıya somut bir hata göster.
    redirect('/admin/login?error=config');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    redirect('/admin/login?error=invalid');
  }

  // Davet edilmiş ama henüz şifre belirlememiş kullanıcı → bilgilendir.
  // "invalid" dönersek kullanıcı ne olduğunu anlamaz; "invite-pending"
  // ile davet email'ine/linkine bakmasını söyleriz.
  if (user.mustSetPassword) {
    redirect('/admin/login?error=invite-pending');
  }
  if (!user.isActive) {
    redirect('/admin/login?error=disabled');
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    redirect('/admin/login?error=invalid');
  }

  // NextAuth JWT payload'ı — authOptions callbacks.jwt'nin ürettiğiyle
  // birebir aynı alan isimleri (id, role, email, name, sub) kullanılıyor
  // ki middleware ve getServerSession aynı session'ı çözsün.
  const maxAge = 24 * 60 * 60; // 24 saat, authOptions.session.maxAge ile eşit
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      role: user.role,
    },
    secret,
    maxAge,
  });

  const cookieName = getCookieName();
  const isSecure = cookieName.startsWith('__Secure-');

  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: isSecure,
    maxAge,
  });

  // Açık redirect koruması: callback sadece kendi sitemizdeki yollara gidebilir.
  const safeCallback = callbackUrl.startsWith('/') ? callbackUrl : '/admin/dashboard';
  redirect(safeCallback);
}

function errorMessage(code?: string): string | null {
  switch (code) {
    case 'missing':
      return 'E-posta ve şifre gerekli.';
    case 'invalid':
      return 'E-posta veya şifre hatalı.';
    case 'config':
      return 'Sunucu yapılandırması eksik (NEXTAUTH_SECRET). Yöneticiye bildirin.';
    case 'invite-pending':
      return 'Bu hesabın şifresi henüz belirlenmedi. E-posta ile gönderilen davet linkini kullan ya da yöneticine yeniden davet talep et.';
    case 'disabled':
      return 'Bu hesap devre dışı bırakılmış. Erişim için yöneticine başvur.';
    default:
      return null;
  }
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const error = errorMessage(sp.error);
  const callbackUrl = sp.callbackUrl ?? '/admin/dashboard';

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

      <form action={loginAction} className="space-y-4" noValidate>
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

        <input type="hidden" name="callbackUrl" value={callbackUrl} />

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
            defaultValue=""
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
          <input
            id="admin-login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className={inputCls}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-white text-zinc-950 rounded-md text-sm font-semibold tracking-tight hover:bg-zinc-200 transition-colors"
        >
          Giriş Yap
        </button>
      </form>

      <p className="mt-7 pt-5 border-t border-zinc-800 text-[11px] text-zinc-500 text-center leading-relaxed">
        Hesabınız mı yok? Yeni hesaplar yalnızca{' '}
        <span className="font-semibold text-zinc-300">Super Admin</span> tarafından oluşturulabilir.
      </p>
    </AuthLayout>
  );
}
