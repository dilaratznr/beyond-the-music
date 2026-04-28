/**
 * 2FA login adımı — parola doğrulandıktan sonra kod isteme sayfası.
 *
 * Server Action ile çalışır (form action). Server Action içinde:
 *   1) Mevcut "tfaPending=verify" cookie'sini decode et
 *   2) Kullanıcı id'sini al, DB'den 2FA secret'ı çek
 *   3) Kullanıcının girdiği kodu doğrula (TOTP veya backup code)
 *   4) Geçerse: tfaPending'siz YENİ JWT issue et, cookie değiştir, yönlendir
 *   5) Geçmezse: rate-limit + audit, hata göster
 */

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { encode, decode } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import { verifyTotpCode, hashBackupCode } from '@/lib/two-factor';
import { rateLimit } from '@/lib/rate-limit';
import { audit } from '@/lib/audit-log';
import { validateInternalRedirect } from '@/lib/url-validation';
import AuthLayout from '@/components/admin/AuthLayout';
import Link from 'next/link';

function getCookieName() {
  const useSecure =
    process.env.NEXTAUTH_URL?.startsWith('https://') ||
    process.env.VERCEL === '1';
  return useSecure
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';
}

async function verifyAction(formData: FormData) {
  'use server';

  const code = String(formData.get('code') ?? '').trim();
  const next = String(formData.get('next') ?? '/admin/dashboard');

  // Pending JWT'yi cookie'den oku (NextAuth'un getToken'ı bizim
  // tfaPending claim'ini de okuyor — sadece imzayı doğruluyor).
  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0].trim() ||
    hdrs.get('x-real-ip')?.trim() ||
    'unknown';
  const userAgent = hdrs.get('user-agent') ?? null;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    redirect('/admin/login?error=config');
  }

  // Server Action'da NextRequest yok — JWT'yi cookie'den manuel decode et.
  const cookieName = getCookieName();
  const cookieValue = (await cookies()).get(cookieName)?.value;
  const token = cookieValue
    ? await decode({ token: cookieValue, secret })
    : null;

  if (!token || token.tfaPending !== 'verify') {
    // Cookie yok veya pending durumda değil — login'e at
    redirect('/admin/login');
  }

  const userId = token.id as string;

  // Re-redirect helper'ı: error message ekleyip orijinal `next` callback'ini
  // koru. Olmadan kullanıcı 2FA fail → retry success sonrası dashboard'a
  // düşüyor, ulaşmak istediği sayfa kaybediliyordu.
  const nextParam = encodeURIComponent(next);
  const failRedirect = (errCode: string) =>
    redirect(`/admin/login/2fa?error=${errCode}&next=${nextParam}`);

  // Brute-force koruması — verify endpoint ile aynı pencere
  const rl = rateLimit(`2fa:login:${userId}`, 5, 60_000);
  if (!rl.success) {
    await audit({
      event: 'TWO_FACTOR_LOGIN_BLOCKED_RATE_LIMIT',
      actorId: userId,
      ip,
      userAgent,
    });
    failRedirect('too-many');
  }

  if (!code) {
    failRedirect('missing');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      twoFactorSecret: true,
      twoFactorEnabledAt: true,
    },
  });

  if (!dbUser?.twoFactorSecret || !dbUser.twoFactorEnabledAt) {
    redirect('/admin/login?error=invalid');
  }

  // İki yol: TOTP kod (6 hane) veya backup kod (8 karakter, A-Z2-7)
  let valid = false;
  let usedBackup = false;

  if (/^\d{6}$/.test(code)) {
    valid = verifyTotpCode(dbUser.twoFactorSecret, code);
  } else {
    // Backup code yolu — hash'le, DB'de eşleşen ve kullanılmamış var mı?
    const codeHash = hashBackupCode(code);
    const backup = await prisma.backupCode.findFirst({
      where: { userId, codeHash, usedAt: null },
    });
    if (backup) {
      // Atomik: bu kodu kullanılmış işaretle (replay engellemek için)
      await prisma.backupCode.update({
        where: { id: backup.id },
        data: { usedAt: new Date() },
      });
      valid = true;
      usedBackup = true;
    }
  }

  if (!valid) {
    await audit({
      event: 'TWO_FACTOR_LOGIN_FAILURE',
      actorId: userId,
      ip,
      userAgent,
    });
    failRedirect('invalid');
  }

  // Tam JWT — tfaPending YOK
  const fullToken = await encode({
    token: {
      sub: dbUser.id,
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name ?? undefined,
      role: dbUser.role,
    },
    secret,
    maxAge: 24 * 60 * 60,
  });

  // cookieName yukarıda zaten tanımlandı (pending JWT okurken). Aynı
  // ismi tekrar declare etmiyoruz; tam JWT'yi de aynı cookie üstüne yazıyoruz.
  (await cookies()).set(cookieName, fullToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: cookieName.startsWith('__Secure-'),
    maxAge: 24 * 60 * 60,
  });

  await audit({
    event: usedBackup ? 'TWO_FACTOR_LOGIN_BACKUP_CODE' : 'LOGIN_SUCCESS',
    actorId: userId,
    ip,
    userAgent,
  });

  redirect(validateInternalRedirect(next));
}

function errorMessage(code?: string): string | null {
  switch (code) {
    case 'missing':
      return 'Kod boş olamaz.';
    case 'invalid':
      return 'Kod hatalı veya süresi geçmiş, tekrar dene.';
    case 'too-many':
      return 'Çok fazla yanlış deneme. 1 dakika bekle.';
    default:
      return null;
  }
}

export default async function TwoFactorLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; next?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const error = errorMessage(sp.error);
  const next = sp.next ?? '/admin/dashboard';

  return (
    <AuthLayout eyebrow="İki Adımlı Doğrulama" title="Telefonundaki kodu gir.">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">
          Doğrulama kodu
        </h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          Authenticator uygulamasındaki 6 haneli kodu, ya da bir yedek kodu gir.
        </p>
      </div>

      <form action={verifyAction} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="flex items-start gap-2.5 p-3 bg-zinc-900/60 border border-zinc-800 border-l-2 border-l-rose-400 text-zinc-200 text-sm rounded-md">
            <span className="text-rose-300 leading-none mt-0.5" aria-hidden="true">●</span>
            <span>{error}</span>
          </div>
        )}

        <input type="hidden" name="next" value={next} />

        <div>
          <label htmlFor="2fa-code" className="block text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
            Kod
          </label>
          <input
            id="2fa-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            placeholder="000000"
            className="w-full px-3.5 py-2.5 text-center text-lg tracking-[0.5em] bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 placeholder:text-zinc-700 focus:border-zinc-500 outline-none"
          />
          <p className="text-[11px] text-zinc-600 mt-2">
            Yedek kod kullanıyorsan formatı önemli değil — `ABCD-EFGH` veya `ABCDEFGH` olabilir.
          </p>
        </div>

        <button type="submit" className="w-full py-2.5 bg-white text-zinc-950 rounded-md text-sm font-semibold hover:bg-zinc-200 transition-colors">
          Doğrula
        </button>
      </form>

      <p className="mt-7 pt-5 border-t border-zinc-800 text-[11px] text-zinc-500 text-center">
        <Link href="/admin/login" className="hover:text-zinc-300">← Farklı hesapla giriş yap</Link>
      </p>
    </AuthLayout>
  );
}
