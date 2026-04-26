import crypto from 'crypto';
import prisma from './prisma';

/**
 * Invite tokens: random base64url raw token + SHA-256 hash in DB.
 * TTL-limited (48h), single-use. Email via nodemailer if SMTP configured,
 * else return raw token for manual sharing.
 */

const TOKEN_BYTES = 32;
// Invite TTL (updates auto in email text).
export const INVITE_TTL_HOURS = 48;
const TOKEN_TTL_MS = INVITE_TTL_HOURS * 60 * 60 * 1000;

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/** Create invite: generate token, invalidate old pending invites, return raw token. */
export async function createInvitation(params: {
  userId: string;
  invitedById: string;
}): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.$transaction([
    // Invalidate old pending invites for user (only latest link active).
    prisma.userInvitation.updateMany({
      where: { userId: params.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.userInvitation.create({
      data: {
        tokenHash,
        userId: params.userId,
        invitedById: params.invitedById,
        expiresAt,
      },
    }),
  ]);

  return { rawToken, expiresAt };
}

/**
 * Token'ı çözümle — geçerliyse ilgili kullanıcıyı döndür, değilse null.
 * Caller ui veya api'de "bu davet geçersiz" mesajı gösterir.
 */
export async function verifyInvitationToken(rawToken: string) {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const record = await prisma.userInvitation.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;
  return record;
}

/**
 * Davet kullanıldı olarak işaretle — şifre belirleme tamamlandığında
 * çağrılır. Caller ayrıca user.mustSetPassword=false + user.password=hash
 * güncellemelerini yapar; bu sadece token satırını kapatır.
 */
export async function markInvitationUsed(invitationId: string) {
  await prisma.userInvitation.update({
    where: { id: invitationId },
    data: { usedAt: new Date() },
  });
}

/**
 * Davet URL'ini oluştur. `NEXT_PUBLIC_APP_URL` varsa onu kullanır,
 * yoksa request origin'ini (caller tarafından geçilen) kullanır.
 */
export function buildInviteUrl(rawToken: string, origin?: string): string {
  const base = origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/admin/accept-invite?token=${rawToken}`;
}

/**
 * Davet email'i gönder. SMTP env'leri set değilse sessizce
 * `{ emailSent: false }` döndürür — caller response'ta URL'i açıkça
 * yollasın ki Super Admin manuel iletebilsin.
 */
export async function sendInviteEmail(params: {
  to: string;
  recipientName: string;
  inviteUrl: string;
  invitedByName: string;
}): Promise<{ emailSent: boolean; error?: string }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return { emailSent: false, error: 'SMTP yapılandırılmamış' };
  }

  try {
    const nodemailer = (await import('nodemailer')).default;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const fromAddress = process.env.SMTP_FROM || `Beyond The Music <${user}>`;
    await transporter.sendMail({
      from: fromAddress,
      to: params.to,
      subject: 'Beyond The Music — Hesap davetin',
      text: `Merhaba ${params.recipientName},

${params.invitedByName} seni Beyond The Music yönetim paneline davet etti.
Şifreni belirleyip hesabını aktifleştirmek için aşağıdaki linke tıkla:

${params.inviteUrl}

Link ${INVITE_TTL_HOURS} saat geçerlidir.

Eğer bu daveti beklemiyorsan bu e-postayı yok sayabilirsin.`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #18181b;">
          <h1 style="font-size: 20px; margin: 0 0 8px;">Beyond The Music</h1>
          <p style="font-size: 14px; color: #52525b; margin: 0 0 24px;">Hesap davetin</p>
          <p style="font-size: 15px; line-height: 1.6;">Merhaba ${params.recipientName},</p>
          <p style="font-size: 15px; line-height: 1.6;">
            <strong>${params.invitedByName}</strong> seni yönetim paneline davet etti.
            Aşağıdaki butona tıklayarak şifreni belirleyip hesabını aktifleştirebilirsin.
          </p>
          <p style="margin: 32px 0;">
            <a href="${params.inviteUrl}" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Hesabımı Oluştur
            </a>
          </p>
          <p style="font-size: 13px; color: #71717a; line-height: 1.6;">
            Bu link <strong>${INVITE_TTL_HOURS} saat</strong> geçerlidir. Eğer bu daveti beklemiyorsan e-postayı yok sayabilirsin.
          </p>
          <p style="font-size: 12px; color: #a1a1aa; margin-top: 24px; word-break: break-all;">
            Buton çalışmıyorsa bu linki kopyala: ${params.inviteUrl}
          </p>
        </div>
      `,
    });
    return { emailSent: true };
  } catch (err) {
    // Tam stack/message'ı server log'una yaz — Super Admin'in deploy
    // ortamında debugging için kritik.
    console.error('[invite-email] gönderim hatası:', err);

    // Response'a generic kategori döner — nodemailer hata mesajları SMTP
    // host/credentials hint'leri içerebilir, UI'da detay sızdırılmaz.
    // Detay için server log'una bakılır; davet linki manuel iletim için
    // response body'sinde zaten dönüyor.
    let category: 'auth' | 'connection' | 'config' | 'unknown' = 'unknown';
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      if (msg.includes('auth') || msg.includes('credentials') || msg.includes('535')) {
        category = 'auth';
      } else if (msg.includes('connect') || msg.includes('timeout') || msg.includes('enotfound')) {
        category = 'connection';
      } else if (msg.includes('from') || msg.includes('verify')) {
        category = 'config';
      }
    }
    const friendly: Record<typeof category, string> = {
      auth: 'SMTP kimlik doğrulama başarısız (kullanıcı/şifre hatalı olabilir)',
      connection: 'SMTP sunucusuna bağlanılamadı',
      config: 'SMTP yapılandırması eksik veya doğrulanmamış',
      unknown: 'Email gönderilemedi (detay server log\'una yazıldı)',
    };
    return { emailSent: false, error: friendly[category] };
  }
}
