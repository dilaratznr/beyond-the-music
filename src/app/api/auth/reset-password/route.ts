import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (pw.length > 200) return 'Password too long';
  // At least one letter + one digit — keeps the bar low for the admin team
  // without inventing exotic rules.
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return 'Password must include letters and numbers';
  }
  return null;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const ipLimit = rateLimit(`reset:ip:${ip}`, 20, 60 * 60 * 1000);
  if (!ipLimit.success) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
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

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!token || token.length < 20 || token.length > 200) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }

  const pwError = validatePassword(password);
  if (pwError) {
    return NextResponse.json({ error: pwError }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  // Timing-safe akış: token yok / süresi geçmiş / kullanılmış / user
  // pasif gibi vakalarda da aynı iş yükünü koşturuyoruz ve aynı
  // generic hata mesajını dönüyoruz. Böylece cevap süresinden
  // "token geçersiz" ile "password geçersiz" arasındaki farkı
  // dışarıdan çıkarsamak mümkün olmasın.
  //
  // Eskisi short-circuit'ti: önce `findUnique`, bulunamazsa hemen
  // döner — bu durumda bcrypt hiç çalışmıyor ve yanıt saliseler
  // mertebesinde geliyordu; geçerli token + yanlış şifre vakası
  // (bcrypt 12 round ~200ms) ile karşılaştırılınca enumerable
  // oluyordu. Şimdi her iki dalda da bcrypt koşturuluyor.

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  const tokenValid =
    !!record &&
    !record.usedAt &&
    record.expiresAt.getTime() >= Date.now();

  const user = tokenValid
    ? await prisma.user.findUnique({ where: { id: record.userId } })
    : null;

  // Her ihtimalde bcrypt çalışsın — bu, başarılı yol ile başarısız
  // yolun timing profilini eşitler. Sonucu sadece geçerli dalda
  // kullanıyoruz.
  const hash = await bcrypt.hash(password, 12);

  if (!tokenValid || !record || !user || !user.isActive) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }

  // Use a transaction so we update the password and consume the token atomically.
  // If anything fails, we don't leave a token marked used with no password change,
  // or vice versa.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: hash },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate any other pending tokens for this user — if a token was leaked,
    // completing a reset should close the window.
    db.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        id: { not: record.id },
      },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true });
}
