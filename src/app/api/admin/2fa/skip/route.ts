import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encode } from 'next-auth/jwt';
import { requireAuth } from '@/lib/auth-guard';
import { audit, extractContext } from '@/lib/audit-log';

/**
 * POST /api/admin/2fa/skip — Onboarding 2FA promptunu atlar.
 *
 * Pending JWT (`tfaPending: 'enroll'`) tam JWT ile değiştirilir; ayrıca
 * `btm-2fa-prompted-${userId}` cookie'si 1 yıl set'lenir, login akışı
 * bu kullanıcıyı bir daha enroll'a yönlendirmez. 2FA istenirse her zaman
 * Ayarlar > Güvenlik üzerinden açılabilir.
 */

function getCookieName() {
  const useSecure =
    process.env.NEXTAUTH_URL?.startsWith('https://') ||
    process.env.VERCEL === '1';
  return useSecure
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';
}

export async function POST(request: NextRequest) {
  // allowPending: bu endpoint tam olarak `tfaPending: 'enroll'` state'inde
  // çağrılır (kullanıcı 2FA setup'ı atlamak istiyor). Pending check'ini
  // bypass etmek burada amaçtır, başka yerde ASLA değil.
  const { error, user } = await requireAuth('EDITOR', { allowPending: true });
  if (error || !user) return error;

  const ctx = extractContext(request);
  const userId = (user as { id: string }).id;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Sunucu yapılandırması eksik' },
      { status: 500 },
    );
  }

  // Pending → full JWT swap (tfaPending claim'i çıkarılır, 24h yetki).
  const fullToken = await encode({
    token: {
      sub: userId,
      id: userId,
      email: (user as { email: string }).email,
      name: (user as { name?: string }).name ?? undefined,
      role: (user as { role: string }).role,
    },
    secret,
    maxAge: 24 * 60 * 60,
  });

  const cookieStore = await cookies();
  const sessionCookieName = getCookieName();
  const isSecure = sessionCookieName.startsWith('__Secure-');

  cookieStore.set(sessionCookieName, fullToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: isSecure,
    maxAge: 24 * 60 * 60,
  });

  // Persist "kullanıcı 2FA promptunu atladı" sinyali. UserId'i cookie
  // değerine yazıyoruz ki ortak tarayıcıda farklı kullanıcı girerse o da
  // kendi promptunu görebilsin.
  cookieStore.set(`btm-2fa-prompted`, userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: isSecure,
    maxAge: 365 * 24 * 60 * 60,
  });

  await audit({
    event: 'TWO_FACTOR_ENROLL_SKIPPED',
    actorId: userId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return NextResponse.json({ skipped: true });
}
