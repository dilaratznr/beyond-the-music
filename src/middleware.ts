import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Edge middleware guards `/admin/*` routes at the request layer — before
 * any page renders. Previously the admin shell relied on a client-side
 * SessionProvider to redirect unauthenticated users, which meant:
 *   - Page chrome briefly flashed for anyone hitting the URL directly
 *   - Logic could be bypassed if a client disabled JS or manipulated
 *     the loading state
 *
 * This middleware issues a 307 to the login page whenever the request
 * either has no next-auth JWT or carries a role that isn't allowed to
 * reach admin. Public admin sub-routes (login, forgot/reset password)
 * are explicitly whitelisted so the flow still works.
 *
 * Reference: next-auth/jwt `getToken` reads & verifies the session
 * cookie on the edge without opening a DB connection.
 */

const PUBLIC_ADMIN_PATHS = [
  '/admin/login',
  '/admin/forgot-password',
  '/admin/reset-password',
];

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const url = new URL('/admin/login', req.url);
    // Kullanıcı giriş yaptıktan sonra ulaşmak istediği sayfaya yönlenir.
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  const role = (token.role as string | undefined) ?? '';
  if (!ALLOWED_ROLES.has(role)) {
    // Oturumu var ama yetkisi yok — login'e değil, yanlış girdiğini
    // belirten login formuna dönelim (URL'de bir hint ile).
    const url = new URL('/admin/login', req.url);
    url.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // `/admin` altındaki her şeyi yakala, fakat Next'in kendi statiklerini
  // ve API rotalarını geçir — API rotaları kendi auth kontrolünü zaten
  // yapıyor, bu middleware sayfalar için.
  matcher: ['/admin/:path*'],
};
