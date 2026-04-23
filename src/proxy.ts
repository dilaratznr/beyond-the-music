import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_LOCALES = ['tr', 'en'];
const DEFAULT_LOCALE = 'tr';

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  // In dev, React needs 'unsafe-eval' for HMR / error stacks; inline styles
  // are also used by dev-only tooling. In prod, nonce + strict-dynamic only.
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    isDev ? "'unsafe-eval'" : '',
  ]
    .filter(Boolean)
    .join(' ');

  const styleSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    // Fallback for older browsers that don't understand nonces, plus
    // runtime CSS injected by some client libraries. Modern browsers ignore
    // 'unsafe-inline' when a nonce is present, so this does not relax the
    // policy for them.
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes protection — pre-auth pages (login + password reset flow)
  // must stay reachable without a session.
  const isPublicAdminPath =
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/admin/forgot-password') ||
    pathname.startsWith('/admin/reset-password');

  if (pathname.startsWith('/admin') && !isPublicAdminPath) {
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
  }

  // API routes, asset paths — just pass through (CSP not meaningful for JSON).
  const isHtmlRequest =
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    !pathname.includes('.');

  // For API/asset paths, continue without nonce/CSP injection.
  if (!isHtmlRequest) {
    return NextResponse.next();
  }

  // Locale routing for public pages.
  const pathnameHasLocale = PUBLIC_LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (!pathnameHasLocale && !pathname.startsWith('/admin')) {
    return NextResponse.redirect(
      new URL(`/${DEFAULT_LOCALE}${pathname}`, request.url),
    );
  }

  // Generate per-request nonce and attach CSP.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|uploads).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
