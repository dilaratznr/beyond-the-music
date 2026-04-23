import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_LOCALES = ['tr', 'en'];
const DEFAULT_LOCALE = 'tr';

/**
 * Strict, per-request CSP used for the admin surface. Every response
 * carries a fresh nonce that `next/script` and Next's own injected
 * inline scripts bind to, and `strict-dynamic` tells modern browsers
 * to trust only scripts loaded from those nonced origins — textbook
 * tight XSS policy.
 *
 * The tradeoff is that the nonce is request-unique, so any page that
 * flows through this branch cannot be ISR-cached (every request's
 * response would contain a different nonce). That's fine for admin:
 * admin pages are already dynamic behind auth.
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

/**
 * Cache-friendly CSP for the public site. Identical constraints to
 * the admin policy, except:
 *   - No per-request nonce. Scripts fall back to `'self' 'unsafe-inline'`.
 *   - No `strict-dynamic` (which would ignore `'unsafe-inline'` on
 *     modern browsers and, without a nonce, block Next's inline
 *     hydration scripts).
 *
 * Why this is an acceptable tradeoff here:
 *   - Public pages don't accept arbitrary HTML from untrusted users.
 *     Article bodies go through an editor whose output we control.
 *   - The CSP still blocks remote script origins (`'self'` only),
 *     `frame-ancestors 'none'` prevents clickjacking, `object-src
 *     'none'` kills Flash-era vectors, and the rest of the headers
 *     (X-Frame-Options, X-Content-Type-Options, Referrer-Policy) are
 *     still in force.
 *   - Dropping the nonce lets every public response be identical for
 *     the same URL, which is what Vercel / Next's ISR needs in order
 *     to edge-cache. That single change turns a ~400ms SSR TTFB into
 *     ~30ms cached TTFB.
 */
function buildPublicCsp(): string {
  const isDev = process.env.NODE_ENV === 'development';
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    isDev ? "'unsafe-eval'" : '',
  ]
    .filter(Boolean)
    .join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
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

// The public CSP is deterministic, so we compute it once at module
// load instead of on every request. The value is a small string
// (~450 bytes) and never changes across requests.
const PUBLIC_CSP = buildPublicCsp();

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

  // Next.js file-convention metadata routes live at the root and are
  // served without a file extension (e.g. `/opengraph-image?<hash>`), so
  // the dot-in-pathname check above doesn't exempt them. Without this
  // bypass the locale redirect turns `/opengraph-image` into `/tr/opengraph-image`,
  // which 404s because the generator actually lives at the app root.
  const isRootMetadataRoute =
    pathname === '/opengraph-image' ||
    pathname === '/twitter-image' ||
    pathname === '/icon' ||
    pathname === '/apple-icon';
  if (isRootMetadataRoute) {
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

  // ── Admin: strict per-request nonce CSP ─────────────────────────────
  //
  // Pass the nonce through request headers so Next's build system can
  // bind its inline scripts to it. This is the behavior that makes
  // admin pages "dynamic" as far as ISR is concerned — which is exactly
  // what we want behind auth.
  if (pathname.startsWith('/admin')) {
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

  // ── Public: deterministic CSP, allow ISR caching ───────────────────
  //
  // Don't mutate request headers here — doing so flags the page as
  // "dynamic" and disables the ISR cache. Only set the response-side
  // CSP header. Same string every time => cacheable at the edge.
  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', PUBLIC_CSP);
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
