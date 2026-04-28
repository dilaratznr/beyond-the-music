import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from './lib/prisma';

const DEFAULT_LOCALE = 'tr';

/**
 * Per-request CSP for admin (nonce + 'self'). Public pages use static CSP
 * in next.config.ts (ISR-cacheable).
 */
function buildAdminCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  // 'self' + nonce allow Next chunks and nonce'd scripts; block inline handlers.
  // (strict-dynamic blocked some Next client chunks in production.)
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    isDev ? "'unsafe-eval'" : '',
  ]
    .filter(Boolean)
    .join(' ');

  const styleSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    // Fallback for older browsers that don't understand nonces.
    "'unsafe-inline'",
  ].join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://generativelanguage.googleapis.com",
    "frame-src 'self' https://www.youtube.com https://youtube.com https://open.spotify.com",
    "media-src 'self' https: blob: data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

// State-mutating HTTP methods (GET/HEAD/OPTIONS are safe per spec).
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Origin validation for /api mutations (CSRF defense). NextAuth v4 + httpOnly
 * + SameSite=lax; Origin/Referer header can't be spoofed by attacker JS.
 * Server Actions already validated by Next.js.
 */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  if (!host) return false;

  const expected = new Set([
    `http://${host}`,
    `https://${host}`,
  ]);

  if (origin) {
    return expected.has(origin);
  }
  if (referer) {
    try {
      const refUrl = new URL(referer);
      return refUrl.host === host;
    } catch {
      return false;
    }
  }
  // Origin VE Referer ikisi de yoksa → fail-closed.
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // ── /api: mutating isteklerde same-origin zorunlu ──────────────────
  //
  // /api/auth/* (NextAuth) ve /api/cron/* hariç — NextAuth kendi CSRF
  // mekanizmasını çalıştırıyor; cron endpoint'leri Bearer token ile
  // kimlik doğrulama yapıyor, tarayıcıdan değil dış scheduler'dan
  // çağrılıyor (Origin header'ı yok, doğal olarak).
  //
  // Bu blok /api/* içinse erken return ediyor — aşağıdaki admin/locale
  // mantığı API yoluna uygulanmasın diye.
  if (pathname.startsWith('/api/')) {
    const skipCsrf =
      pathname.startsWith('/api/auth/') || pathname.startsWith('/api/cron/');
    if (MUTATING_METHODS.has(method) && !skipCsrf) {
      if (!isSameOrigin(request)) {
        return NextResponse.json(
          { error: 'Forbidden — cross-origin request' },
          { status: 403 },
        );
      }
    }
    return NextResponse.next();
  }

  // ── Admin: auth gate + role check + strict per-request nonce CSP ───
  if (pathname.startsWith('/admin')) {
    const isPublicAdminPath =
      pathname.startsWith('/admin/login') ||
      // Davet linkine tıklayan henüz login değil — auth gate'inden
      // muaf. Ayrıca nonce CSP de uygulanmıyor (aşağıda): client-side
      // chunk'lar Turbopack hash'leriyle geliyor, strict-dynamic'in
      // talep ettiği nonce tag'i her zaman inject olmadığı için
      // (özellikle client-heavy sayfalarda) bloke ediliyordu. Accept-
      // invite sensitive session verisi taşımadığı için hafifletilmiş
      // policy yeterli — next.config.ts'teki genel güvenlik header'ları
      // (HSTS, X-Frame-Options vb.) zaten her route'ta aktif.
      pathname.startsWith('/admin/accept-invite');

    if (!isPublicAdminPath) {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!token) {
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Role-based hard gate: session var ama rol ADMIN/SUPER_ADMIN/EDITOR
      // değilse kullanıcı admin bölgesine giremez. Önceden sadece session
      // varlığı kontrol ediliyordu → pasif/yanlış rollü bir kullanıcı
      // admin'e sızabilirdi. Şimdi role de doğrulanıyor.
      const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
      const role = (token.role as string | undefined) ?? '';
      if (!ALLOWED_ROLES.has(role)) {
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(loginUrl);
      }

      // Stale-JWT koruması: JWT signature OK olsa bile, kullanıcı DB'de
      // hâlâ var ve aktif mi kontrol et. Aksi halde silinen/pasifleştirilen
      // bir admin, eski cookie'siyle 24 saat boyunca admin yetkilerini
      // kullanmaya devam ederdi (JWT stateless). Bu DB query her admin
      // sayfa yükünde 1 ek call ekliyor (~5-15ms) — internal admin paneli
      // için kabul edilebilir maliyet, public traffic'i etkilemez.
      const tokenUserId = token.id as string | undefined;
      if (tokenUserId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: tokenUserId },
          select: { isActive: true, role: true },
        });
        if (!dbUser || !dbUser.isActive || !ALLOWED_ROLES.has(dbUser.role)) {
          // Cookie'yi siliyoruz ki sonsuza kadar redirect loop'a girmesin —
          // kullanıcı login sayfasında temiz bir başlangıç yapsın.
          const loginUrl = new URL('/admin/login', request.url);
          loginUrl.searchParams.set('error', 'session-expired');
          const response = NextResponse.redirect(loginUrl);
          // NextAuth'un kullandığı her iki cookie ismini de sil
          response.cookies.delete('__Secure-next-auth.session-token');
          response.cookies.delete('next-auth.session-token');
          return response;
        }
        // DB'deki güncel role JWT'dekinden farklıysa (admin tarafından
        // değiştirilmiş), DB'yi otorite kabul ediyoruz — kullanıcı ne
        // hak ediyorsa onu görsün, JWT'deki eski role'e güvenmiyoruz.
        // Burada sadece pathname'i bloklayıp loglamıyoruz; downstream
        // permission check'leri zaten DB'den okuyor (auth-guard.ts).
      }

      // 2FA gate: parola OK ama henüz TOTP kodu doğrulanmadı.
      // Sadece /admin/login/2fa ve /admin/security/2fa/setup'a izin var.
      const tfaPending = token.tfaPending as string | undefined;
      if (tfaPending === 'verify') {
        const allowed = pathname.startsWith('/admin/login/2fa');
        if (!allowed) {
          return NextResponse.redirect(new URL('/admin/login/2fa', request.url));
        }
      } else if (tfaPending === 'enroll') {
        // Onboarding: 2FA kurulumunu bitirmeden başka admin sayfasına geçemez.
        const allowed = pathname.startsWith('/admin/security/2fa/setup');
        if (!allowed) {
          return NextResponse.redirect(
            new URL('/admin/security/2fa/setup?onboarding=1', request.url),
          );
        }
      }
    }

    // Public admin path'ler nonce CSP'den muaf — yukarıdaki açıklamaya
    // bakın. Next'in kendi varsayılan güvenlik davranışı + next.config.ts
    // global header'ları kalır. Ancak `x-pathname`'i BURADA da set etmek
    // şart: AdminAuthGate component'i admin layout'ta çalışıyor ve bu
    // header'ı okuyor. Set edilmezse fallback `/admin` kullanıyor →
    // public path saymıyor → /admin/login'e redirect → sonsuz döngü.
    if (isPublicAdminPath) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-pathname', pathname);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Fresh nonce per request. Passing it through request headers is
    // what makes Next "dynamic" — fine here since admin pages are
    // always dynamic behind auth anyway.
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
    const csp = buildAdminCsp(nonce);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', csp);
    // Layout/page server component'lerinin pathname'i bilmesi için —
    // Next.js varsayılan olarak headers()'ta pathname expose etmiyor.
    // Defense-in-depth auth gate (AdminAuthGate) bunu okuyup public
    // route'ları muaf tutuyor.
    requestHeaders.set('x-pathname', pathname);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set('Content-Security-Policy', csp);
    // Admin sayfaları kişiye özel + auth'la korunmuş — browser back-button,
    // proxy cache veya CDN'de tutulmamalı. Logout sonrası "back" tuşu
    // önceki admin sayfasını cache'ten çekmesin diye no-store şart.
    // `private` zaten paylaşılan cache'e izin vermiyor; `must-revalidate`
    // intermediate proxy'lerin stale serving'ini bloke ediyor.
    response.headers.set(
      'Cache-Control',
      'private, no-store, no-cache, must-revalidate, max-age=0',
    );
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  // ── Locale-less public paths: redirect to default locale ───────────
  //
  // By this point the matcher has already excluded `_next`, `uploads`,
  // `/api`, and the `/tr/*` + `/en/*` locale prefixes. What's left is
  // things like `/` or `/foo` that we want to push under `/tr/...`.
  // Root metadata routes (`/opengraph-image`, `/robots.txt`, etc.) are
  // also excluded by the matcher so they stay at the app root.
  return NextResponse.redirect(
    new URL(`/${DEFAULT_LOCALE}${pathname}`, request.url),
  );
}

export const config = {
  matcher: [
    // /admin/* + /api/* + locale-less paths. Diğer her şey (özellikle
    // /tr/*, /en/*, _next/static, metadata route'ları, uploads) ISR
    // cache'ten direkt servis edilebilsin diye middleware'i atlamalı.
    {
      source:
        '/((?!_next/static|_next/image|favicon\\.ico|opengraph-image|twitter-image|icon|apple-icon|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|uploads|tr/|en/|tr$|en$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
