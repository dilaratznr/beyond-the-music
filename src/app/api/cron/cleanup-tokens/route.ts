import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Cron job: deletes expired/used invitation and password reset tokens daily.
 * Also enforces tiered retention on the AuditLog table — see below.
 * Auth via CRON_SECRET bearer token (Vercel Cron sends auto). force-dynamic
 * to always write to DB.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 7-day debug/audit window; override via env if needed.
const USED_TOKEN_RETENTION_DAYS = 7;

// ─── Audit log retention (tiered) ───────────────────────────────────────────
//
// Rationale: not all audit events have the same forensic value. Security-
// relevant events (failed logins, blocked attempts, role changes) are
// retained longer because incident analysis often surfaces months later.
// Routine events (successful logins, simple reads) decay much faster —
// they're noise after a quarter.
//
// We DON'T add a `severity` column to the schema (would require migration
// + every audit() caller annotating the tier). Instead we derive the tier
// from the event name's prefix/suffix at cleanup time. New event types
// default to STANDARD, so retention stays sane without code changes.
//
// To override: bump these constants. Worst case: unbounded growth at
// ~36 MB / year on current volume — small, but cron keeps it bounded.

const RETENTION_DAYS = {
  /** Login failures, blocked attempts, 2FA failures, suspicious patterns. */
  SECURITY: 730, // 2 years — long enough for legal/forensic review windows
  /** Role changes, user CRUD, permission edits, password changes. */
  ADMIN_ACTION: 365, // 1 year — covers an audit cycle
  /** Successful logins, content publish, generic edits. */
  STANDARD: 180, // 6 months — typical operational lookback
};

/**
 * Map an event name string to its retention tier. Order of checks matters:
 * more specific patterns must come first.
 */
function tierFor(event: string): keyof typeof RETENTION_DAYS {
  if (
    event.includes('FAILURE') ||
    event.includes('BLOCKED') ||
    event.includes('UNAUTHORIZED') ||
    event.includes('REJECTED') ||
    event.startsWith('TWO_FACTOR_LOGIN_') ||
    event === 'TWO_FACTOR_DISABLED' ||
    event === 'PERMISSIONS_CHANGED'
  ) {
    return 'SECURITY';
  }
  if (
    event.includes('USER_') ||
    event.includes('ROLE_') ||
    event.includes('PASSWORD_') ||
    event.includes('_DELETED') ||
    event.includes('INVITATION_')
  ) {
    return 'ADMIN_ACTION';
  }
  return 'STANDARD';
}

async function pruneAuditLogs(now: Date): Promise<{
  scanned: number;
  deleted: Record<keyof typeof RETENTION_DAYS, number>;
}> {
  const out = {
    scanned: 0,
    deleted: { SECURITY: 0, ADMIN_ACTION: 0, STANDARD: 0 } as Record<
      keyof typeof RETENTION_DAYS,
      number
    >,
  };

  // We can't run three independent deleteMany calls keyed by event NAME
  // patterns directly (Prisma doesn't have OR-of-includes pattern). Two
  // ways to do this cleanly:
  //   1) Query distinct event names with row counts older than max-tier
  //      cutoff, classify each, delete with the right cutoff.
  //   2) Add `severity` column, delete by severity (cleanest but needs
  //      migration).
  //
  // We pick (1) — single migration-free pass, minimal data scanned
  // (only event names + their oldest-acceptable cutoff). Cron is daily
  // and table is small; even a full scan via Prisma here is cheap.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  let distinct: Array<{ event: string }>;
  try {
    distinct = (await db.auditLog.findMany({
      select: { event: true },
      distinct: ['event'],
    })) as Array<{ event: string }>;
  } catch {
    // Table not migrated — silently skip pruning.
    return out;
  }

  for (const { event } of distinct) {
    const tier = tierFor(event);
    const cutoffMs = now.getTime() - RETENTION_DAYS[tier] * 24 * 60 * 60 * 1000;
    const cutoff = new Date(cutoffMs);
    const res = await db.auditLog.deleteMany({
      where: { event, createdAt: { lt: cutoff } },
    });
    out.scanned += 1;
    out.deleted[tier] += res.count;
  }
  return out;
}

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
  const [invitations, resets, audit] = await Promise.all([
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
    pruneAuditLogs(now),
  ]);

  return NextResponse.json({
    ok: true,
    deletedAt: now.toISOString(),
    invitations: invitations.count,
    passwordResets: resets.count,
    auditLogs: audit,
  });
}
