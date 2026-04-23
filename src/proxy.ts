import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const DEFAULT_LOCALE = 'tr';

/**
 * Strict, per-request CSP used for the admin surface. Every response
 * carries a fresh nonce that `next/script` and Next's own injected
 * inline scripts bind to, and `strict-dynamic` tells modern browsers
 * to trust only scripts loaded from those nonced origins.
 *
 * Public pages do NOT flow through this middleware — see the matcher
 * at the bottom of the file. Their (static) CSP lives in
 * `next.config.ts` so Vercel's edge can treat them as ISR-cacheable.
 */
function buildAdminCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
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

  // ── Admin: auth gate + strict per-request nonce CSP ────────────────
  //
  // Pre-auth admin pages (login + password reset) stay reachable
  // without a session; everything else requires a valid JWT.
  if (pathname.startsWith('/admin')) {
    const isPublicAdminPath =
      pathname.startsWith('/admin/login') ||
      pathname.startsWith('/admin/forgot-password') ||
      pathname.startsWith('/admin/reset-password');

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
    }

    // Fresh nonce per request. Passing it through request headers is
    // what makes Next "dynamic" — fine here since admin pages are
    // always dynamic behind auth anyway.
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
    const csp = buildAdminCsp(nonce);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', csp);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set('Content-Security-Policy', csp);
    return response;
  }

  // ── Locale-less public paths: redirect to default locale ───────────
  //
  // By this point the matcher has already excluded `_next`, `uploads`,
  // `/api`, and the `/tr/*` + `/en/*` locale prefixes. What's left is
  // things like `/` or `/foo` that we want to push under `/tr/...`.
  // Root metadata routes (`/opengraph-image`, `/robots.txt`, etc.)
  // are also excluded by the matcher so they stay at the app root.
  return NextResponse.redirect(
    new URL(`/${DEFAULT_LOCALE}${pathname}`, request.url),
  );
}

export const config = {
  matcher: [
    // The middleware should only run for:
    //   - /admin/* (auth + per-request nonce CSP)
    //   - locale-less top-level paths that need a redirect (/foo → /tr/foo)
    //
    // Everything else — and especially /tr/* and /en/* — MUST bypass the
    // middleware so Vercel's ISR cache can serve those pages.
    //
    // The negative lookahead excludes:
    //   _next/static, _next/image      — build assets
    //   favicon.ico, opengraph-image   — Next file-convention metadata
    //   twitter-image, icon, apple-icon, manifest.webmanifest,
    //   robots.txt, sitemap.xml        — ditto
    //   uploads                        — our content-addressed images
    //   api                            — JSON handlers, never HTML
    //   tr, en                         — locale-prefixed public pages
    //   ?!.*\\.                       — anything with a file extension
    {
      source:
        '/((?!_next/static|_next/image|favicon\\.ico|opengraph-image|twitter-image|icon|apple-icon|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|uploads|api|tr/|en/|tr$|en$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
