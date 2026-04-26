import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Cron job: deletes expired/used invitation and password reset tokens daily.
 * Auth via CRON_SECRET bearer token (Vercel Cron sends auto). force-dynamic
 * to always write to DB.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 7-day debug/audit window; override via env if needed.
const USED_TOKEN_RETENTION_DAYS = 7;

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Fail-closed if CRON_SECRET unset (prevent misconfiguration exposure).
    return false;
  }
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  // Constant-time comparison to prevent timing attacks.
  if (token.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const usedCutoff = new Date(
    now.getTime() - USED_TOKEN_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  // Delete if: expiresAt < now OR usedAt < retention cutoff.
  const [invitations, resets] = await Promise.all([
    prisma.userInvitation.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { usedAt: { lt: usedCutoff } }],
      },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { usedAt: { lt: usedCutoff } }],
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    deletedAt: now.toISOString(),
    invitations: invitations.count,
    passwordResets: resets.count,
  });
}
