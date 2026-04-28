import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { NextResponse } from 'next/server';
import { getUserPermissions } from './permissions';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';

const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 3,
  ADMIN: 2,
  EDITOR: 1,
};

/**
 * Public API endpoints (e.g. `/api/articles`) are shared between the
 * public site and the admin panel. Anonymous visitors should only see
 * PUBLISHED rows; an admin reading the same endpoint should see DRAFT /
 * PENDING_REVIEW too. Use this helper to gate the difference: it
 * returns true ONLY for an authenticated user with an admin-tier role
 * AND no pending 2FA flow. Anything else (anonymous, half-logged-in,
 * non-admin role) → false → caller forces `status: 'PUBLISHED'`.
 */
export async function isAdminRequest(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  // Half-authenticated session (2FA pending) is treated as anonymous for
  // public-API filtering — the user hasn't actually proven they're admin.
  const tfaPending = (session.user as { tfaPending?: string }).tfaPending;
  if (tfaPending) return false;
  const role = (session.user as { role?: string }).role;
  return role === 'EDITOR' || role === 'ADMIN' || role === 'SUPER_ADMIN';
}

interface AuthOptions {
  /**
   * Allow requests from a JWT that still carries `tfaPending`. ONLY the
   * 2FA flow endpoints themselves (verify / setup / skip) should opt
   * into this — every other admin route must reject pending sessions
   * to prevent the second factor from being skipped via direct API
   * calls. Default: false.
   */
  allowPending?: boolean;
}

/**
 * Reject if the session's JWT still has a `tfaPending` claim. The proxy
 * (src/proxy.ts) gates page navigation, but API requests bypass the
 * proxy's admin block — so if we don't check here, a half-authenticated
 * client could call any admin API by hitting the URL directly.
 */
function rejectIfPending(
  session: { user?: unknown } | null,
  options: AuthOptions,
): NextResponse | null {
  if (options.allowPending) return null;
  const tfaPending = (session?.user as { tfaPending?: string } | undefined)?.tfaPending;
  if (tfaPending) {
    return NextResponse.json(
      { error: 'Two-factor authentication required', tfaPending },
      { status: 403 },
    );
  }
  return null;
}

export async function requireAuth(
  minimumRole: Role = 'EDITOR',
  options: AuthOptions = {},
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  }

  const pendingError = rejectIfPending(session, options);
  if (pendingError) return { error: pendingError, user: null };

  const userRole = (session.user as { role: Role }).role;
  const userId = (session.user as { id: string }).id;

  if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minimumRole]) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  }

  return { error: null, user: { ...session.user, id: userId, role: userRole } };
}

export async function requireSectionAccess(
  section: string,
  action: 'canCreate' | 'canEdit' | 'canDelete' | 'canPublish',
  options: AuthOptions = {},
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  }

  const pendingError = rejectIfPending(session, options);
  if (pendingError) return { error: pendingError, user: null };

  const userId = (session.user as { id: string }).id;
  const perms = await getUserPermissions(userId);

  if (!perms) {
    return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }), user: null };
  }

  // Super admin bypasses all checks
  if (perms.isSuperAdmin) {
    return { error: null, user: { ...session.user, id: userId, role: perms.user.role } };
  }

  const sectionPerm = perms.sections[section];
  if (!sectionPerm || !sectionPerm[action]) {
    return { error: NextResponse.json({ error: `No ${action} permission for ${section}` }, { status: 403 }), user: null };
  }

  return { error: null, user: { ...session.user, id: userId, role: perms.user.role } };
}
