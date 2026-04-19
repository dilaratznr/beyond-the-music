import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import prisma from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Length chosen so a 256-bit token base64url-encodes to 43 chars.
const TOKEN_BYTES = 32;
// Tokens expire in 30 minutes. Short enough to limit blast radius, long
// enough that users can walk to their email client.
const TOKEN_TTL_MS = 30 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;
}

function originFromRequest(req: NextRequest): string {
  // Prefer the explicit public URL so emailed links always point at the
  // public domain, even if the request came in via an internal hostname.
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Two layered limits:
  // - per-IP: stop a flood of enumerated emails from one source
  // - per-email: stop a single account from being spammed with reset mails
  const ipLimit = rateLimit(`forgot:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!ipLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(ipLimit.resetInMs / 1000)) },
      },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!isValidEmail(email)) {
    // Respond with generic success to avoid confirming which addresses exist.
    return NextResponse.json({ success: true });
  }

  const emailLimit = rateLimit(`forgot:email:${email}`, 3, 60 * 60 * 1000);
  if (!emailLimit.success) {
    // Still return generic success — attackers shouldn't learn whether the
    // limit was per-IP or per-account.
    return NextResponse.json({ success: true });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Only issue tokens for active, real accounts. But always return success,
  // so an attacker can't tell from the response whether the email exists.
  if (user && user.isActive) {
    const rawToken = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).passwordResetToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt,
        },
      });
    } catch (err) {
      console.error('[forgot-password] failed to create token', err);
      // Return generic success — never leak DB state.
      return NextResponse.json({ success: true });
    }

    const resetUrl = `${originFromRequest(request)}/admin/reset-password?token=${rawToken}`;

    const hasSmtp =
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

    if (hasSmtp) {
      try {
        const port = parseInt(process.env.SMTP_PORT || '587', 10);
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port,
          secure: port === 465,
          auth: {
            user: process.env.SMTP_USER!,
            pass: process.env.SMTP_PASS!,
          },
        });

        await transporter.sendMail({
          from: `"Beyond The Music" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: 'Beyond The Music — Password reset',
          text:
            `Hi ${user.name || ''},\n\n` +
            `A password reset was requested for your Beyond The Music admin account.\n\n` +
            `Reset your password here (valid for 30 minutes):\n${resetUrl}\n\n` +
            `If you did not request this, you can ignore this email.\n`,
          html:
            `<p>Hi ${user.name || ''},</p>` +
            `<p>A password reset was requested for your Beyond The Music admin account.</p>` +
            `<p><a href="${resetUrl}" style="display:inline-block;padding:10px 18px;background:#10b981;color:#000;font-weight:600;border-radius:9999px;text-decoration:none">Reset your password</a></p>` +
            `<p>This link is valid for 30 minutes. If you did not request this, you can ignore this email.</p>` +
            `<p style="font-size:12px;color:#666">If the button doesn't work, paste this URL into your browser:<br/>${resetUrl}</p>`,
        });
      } catch (err) {
        console.error('[forgot-password] SMTP send failed', err);
        // Still return success — don't leak SMTP state to clients.
      }
    } else {
      // No SMTP in dev/staging — log the URL so the developer can still proceed.
      console.warn(
        `[forgot-password] SMTP not configured. Reset URL for ${user.email}: ${resetUrl}`,
      );
    }
  }

  return NextResponse.json({ success: true });
}
