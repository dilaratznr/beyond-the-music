import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { generateTwoFactorSetup } from '@/lib/two-factor';

/**
 * POST /api/admin/2fa/setup
 *
 * Yeni bir TOTP secret üretir, DB'ye `twoFactorSecret` olarak yazar
 * (henüz `twoFactorEnabledAt` set etmiyor — kullanıcı kodu doğrulayana
 * kadar setup yarım kalmış sayılır), QR kodu data URL olarak döner.
 *
 * Var olan bir secret'ın üstüne yazar — kullanıcı setup'ı yarıda bırakıp
 * yeniden başlatırsa eski secret invalidate olsun. Eğer 2FA zaten aktif
 * ise (`twoFactorEnabledAt` dolu) → 409 döner; önce disable etmesi lazım.
 */
export async function POST() {
  const { error, user } = await requireAuth('EDITOR');
  if (error || !user) return error;

  const userId = (user as { id: string }).id;

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, email: true, twoFactorEnabledAt: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (existing.twoFactorEnabledAt) {
    return NextResponse.json(
      { error: '2FA zaten aktif. Önce devre dışı bırakın.' },
      { status: 409 },
    );
  }

  // Authenticator app'te hesabı tanıtmak için: email varsa email, yoksa username.
  // (TOTP standart: issuer:account-label formatında gözükür.)
  const accountLabel = existing.email ?? existing.username;
  const setup = generateTwoFactorSetup(accountLabel);

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: setup.secretEncrypted,
      twoFactorEnabledAt: null, // henüz aktif değil
    },
  });

  // QR kod data URL'i — admin sayfası bunu <img src> olarak gösterecek
  const qrDataUrl = await QRCode.toDataURL(setup.otpauthUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256,
  });

  return NextResponse.json({
    qrDataUrl,
    // Manuel girmek isteyen kullanıcı için (QR taranamadığında), secret'ı
    // base32 formatında da göster — Authenticator app'ler manuel giriş'i
    // destekler.
    otpauthUrl: setup.otpauthUrl,
  });
}
