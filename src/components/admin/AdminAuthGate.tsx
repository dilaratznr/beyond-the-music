import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Layout-level auth gate (defense-in-depth). Middleware (proxy.ts) already
 * validates /admin requests, but we re-check here for edge-case safety.
 * Allows /admin/login and /admin/accept-invite; redirects others to login.
 */

const PUBLIC_ADMIN_PREFIXES = ['/admin/login', '/admin/accept-invite'];

function isPublicAdminPath(pathname: string): boolean {
  return PUBLIC_ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
}

export default async function AdminAuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  // x-pathname set by middleware; fallback to /admin if missing (edge-case safety).
  const pathname = hdrs.get('x-pathname') ?? '/admin';

  if (isPublicAdminPath(pathname)) {
    return <>{children}</>;
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = encodeURIComponent(pathname);
    redirect(`/admin/login?callbackUrl=${callbackUrl}`);
  }

  return <>{children}</>;
}
