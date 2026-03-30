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

export async function requireAuth(minimumRole: Role = 'EDITOR') {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  }

  const userRole = (session.user as { role: Role }).role;
  const userId = (session.user as { id: string }).id;

  if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minimumRole]) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  }

  return { error: null, user: { ...session.user, id: userId, role: userRole } };
}

export async function requireSectionAccess(section: string, action: 'canCreate' | 'canEdit' | 'canDelete' | 'canPublish') {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  }

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
