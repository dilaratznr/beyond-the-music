/**
 * Admin login via Server Action (not client). Form works without JS;
 * server sets session cookie directly (NextAuth-compatible format).
 */

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import { encode } from 'next-auth/jwt';
import AuthLayout from '@/components/admin/AuthLayout';
import { rateLimit } from '@/lib/rate-limit';
import { validateInternalRedirect } from '@/lib/url-validation';
import { audit } from '@/lib/audit-log';
import { findUserByIdentifier } from '@/lib/user-lookup';

const inputCls =
  'w-full px-3.5 py-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors hover:border-zinc-700 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20';

// HTTPS deployments use __Secure- prefix (NextAuth v4).
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

  // Single input: kullanıcı adı veya e-posta. `@` varlığına göre branch
  // edilir (findUserByIdentifier içinde). Trim + lowercase ile normalize.
  const identifier = String(formData.get('identifier') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const callbackUrl = String(formData.get('callbackUrl') ?? '/admin/dashboard');

  if (!identifier || !password) {
    redirect('/admin/login?error=missing');
  }

  // Brute-force koruması (iki katman): IP başına 20/10dk + identifier başına
  // 5/10dk. Identifier (username veya email) sabit kaldığı sürece rotating-proxy
  // saldırısını da yakalar.
  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0].trim() ||
    hdrs.get('x-real-ip')?.trim() ||
    'unknown';

  const ipLimit = rateLimit(`login:ip:${ip}`, 20, 10 * 60 * 1000);
  const idLimit = rateLimit(`login:id:${identifier}`, 5, 10 * 60 * 1000);
  const userAgent = hdrs.get('user-agent') ?? null;

  if (!ipLimit.success || !idLimit.success) {
    await audit({
      event: 'LOGIN_BLOCKED_RATE_LIMIT',
      ip,
      userAgent,
      detail: `identifier=${identifier}`,
    });
    redirect('/admin/login?error=too-many');
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    // Env variable'ı unutulmuşsa kullanıcıya somut bir hata göster.
    redirect('/admin/login?error=config');
  }

  const user = await findUserByIdentifier(identifier);

  // Username enumeration koruması: user yoksa da bcrypt.compare'i sabit
  // bir DUMMY_HASH'le çalıştırıyoruz ki yanıt süresi (~80ms) normalize
  // olsun, saldırgan timing'le DB'de hangi email var çıkaramasın.
  const DUMMY_HASH =
    '$2a$12$abcdefghijklmnopqrstuuogf04zU82MgjlnRcCfg4S5tRaqQRPhNu';
  const passwordHash = user?.password ?? DUMMY_HASH;
  const passwordOk = await bcrypt.compare(password, passwordHash);

  // Hesap durum kontrolleri SADECE şifre doğru olduğunda yapılıyor —
  // aksi halde "invite-pending" / "disabled" hata mesajları, doğru
  // şifre bilmeyen saldırgana hesabın varlığını sızdırır. Bu sıralama
  // kasıtlı: önce auth, sonra status reveal.
  if (!user || !passwordOk) {
    await audit({
      event: 'LOGIN_FAILURE',
      actorId: user?.id ?? null,
      ip,
      userAgent,
      detail: `identifier=${identifier}`,
    });
    redirect('/admin/login?error=invalid');
  }

  if (user.mustSetPassword) {
    redirect('/admin/login?error=invite-pending');
  }
  if (!user.isActive) {
    await audit({
      event: 'LOGIN_BLOCKED_DISABLED',
      actorId: user.id,
      ip,
      userAgent,
    });
    redirect('/admin/login?error=disabled');
  }

  // 2FA durumu:
  //   - Aktif → 'verify' (pending JWT, sadece /admin/login/2fa'ya gidebilir)
  //   - Aktif değil ve kullanıcı promptu daha önce atlamamış → 'enroll'
  //     (onboarding setup ekranı, "Şimdi atla" butonu var)
  //   - Aktif değil ve atlamış → null (full session, 2FA opsiyonel kalır)
  //
  // "Atladım" sinyali `btm-2fa-prompted` cookie'sinde kullanıcı id'siyle
  // saklanıyor; başka tarayıcıda yeniden girince yine prompt gösterilir
  // ki kullanıcı mevcut cihazını güvenceye alma fırsatını kaçırmasın.
  const cookieStore = await cookies();
  const promptedFor = cookieStore.get('btm-2fa-prompted')?.value;
  const alreadyPrompted = promptedFor === user.id;

  const tfaPending: 'verify' | 'enroll' | null = user.twoFactorEnabledAt
    ? 'verify'
    : alreadyPrompted
      ? null
      : 'enroll';

  // Pending JWT — sadece tfa endpoint'lerine erişim sağlar. 5 dakika
  // geçerli (kullanıcı sayfada oyalanmasın diye kısa). Kod doğrulanınca
  // bu cookie tam JWT ile değiştirilir.
  const pendingMaxAge = 5 * 60;
  const fullMaxAge = 24 * 60 * 60;
  const maxAge = tfaPending ? pendingMaxAge : fullMaxAge;
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email ?? undefined,
      username: user.username,
      name: user.name ?? undefined,
      role: user.role,
      tfaPending: tfaPending ?? undefined,
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

  await audit({
    event:
      tfaPending === 'verify'
        ? 'LOGIN_PASSWORD_OK_AWAITING_2FA'
        : tfaPending === 'enroll'
          ? 'LOGIN_PASSWORD_OK_AWAITING_2FA_ENROLL'
          : 'LOGIN_SUCCESS',
    actorId: user.id,
    ip,
    userAgent,
  });

  // 2FA pending → ilgili sayfaya at, callbackUrl'i query'de tut.
  // 2FA verify sonrası callback'e döneriz.
  if (tfaPending === 'verify') {
    const target = `/admin/login/2fa?next=${encodeURIComponent(
      validateInternalRedirect(callbackUrl),
    )}`;
    redirect(target);
  }
  if (tfaPending === 'enroll') {
    redirect('/admin/security/2fa/setup?onboarding=1');
  }

  // 2FA yok ya da zaten doğrulanmış → tam yetki, callback'e git.
  redirect(validateInternalRedirect(callbackUrl));
}

function errorMessage(code?: string): string | null {
  switch (code) {
    case 'missing':
      return 'Kullanıcı adı (veya e-posta) ve şifre gerekli.';
    case 'invalid':
      return 'Kullanıcı adı/e-posta veya şifre hatalı.';
    case 'config':
      return 'Sunucu yapılandırması eksik (NEXTAUTH_SECRET). Yöneticiye bildirin.';
    case 'invite-pending':
      return 'Bu hesabın şifresi henüz belirlenmedi. E-posta ile gönderilen davet linkini kullan ya da yöneticine yeniden davet talep et.';
    case 'disabled':
      return 'Bu hesap devre dışı bırakılmış. Erişim için yöneticine başvur.';
    case 'too-many':
      return 'Çok fazla başarısız deneme. Lütfen 10 dakika sonra tekrar dene.';
    case 'unauthorized':
      return 'Bu hesabın admin paneline erişim yetkisi yok.';
    case 'session-expired':
      return 'Oturumun sona erdi. Lütfen tekrar giriş yap.';
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
            htmlFor="admin-login-identifier"
            className="block text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider"
          >
            Kullanıcı adı veya e-posta
          </label>
          <input
            id="admin-login-identifier"
            name="identifier"
            type="text"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            defaultValue=""
            placeholder="kullanıcı adı"
            className={inputCls}
            required
          />
        </div>

        <div>
          <label
            htmlFor="admin-login-password"
            className="block text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider"
          >
            Şifre
          </label>
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
