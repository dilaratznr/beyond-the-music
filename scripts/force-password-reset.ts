/**
 * One-off: tüm admin/editor/super_admin hesaplarını "şifre yenile"
 * akışına zorla.
 *
 * NE YAPAR:
 *   - Her aktif kullanıcının `password`'ünü asla eşleşmeyecek bir
 *     placeholder hash'le değiştirir → mevcut şifre artık geçersiz.
 *   - `mustSetPassword=true` set eder → kullanıcı login'e gelirse
 *     "invite-pending" hata alır, kendi başına giremez.
 *   - Her kullanıcı için yeni bir UserInvitation token üretir ve
 *     console'a "Şu kullanıcıya şu URL'i gönder:" formatında basar.
 *     SMTP set edilmişse email de gönderilir; yoksa sen manuel iletirsin.
 *
 * NEDEN GEREKLİ: 12-karakter şifre politikası sadece yeni reset/invite
 * akışında zorlanıyor; mevcut kısa şifreler hâlâ çalışırdı. Bu script,
 * tek seferlik bir "rotate" — herkes yeni politikaya uygun bir şifre
 * belirler.
 *
 * KULLANIM:
 *   npx tsx scripts/force-password-reset.ts
 *   npx tsx scripts/force-password-reset.ts --only-email a@b.com   # tek kişi
 *   npx tsx scripts/force-password-reset.ts --dry-run              # ne yapacağını göster, yapma
 *
 * GÜVENLİK:
 *   - Script yerel olarak çalışır, DATABASE_URL .env'den okunur.
 *   - Çalıştırmadan önce mutlaka DB backup al (production'da).
 *   - Senin SUPER_ADMIN hesabını da etkiler — kendine yeni bir davet
 *     URL'i çıkacak, onu kullanıp şifreni belirle.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';
import { createInvitation } from '../src/lib/user-invitations';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyEmailIdx = args.indexOf('--only-email');
const onlyEmail =
  onlyEmailIdx >= 0 ? args[onlyEmailIdx + 1]?.toLowerCase() : null;

async function main() {
  // Asla eşleşmeyen placeholder — bcrypt hash format'ında, ama hiçbir
  // gerçek şifrenin compare'i true dönmesin.
  const PLACEHOLDER_HASH = await bcrypt.hash(
    `__force-reset-${Date.now()}-${Math.random()}`,
    12,
  );

  const where = onlyEmail
    ? { email: onlyEmail, isActive: true }
    : { isActive: true };

  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true, role: true },
  });

  if (users.length === 0) {
    console.log('Hiç eşleşen kullanıcı yok. Çıkıyor.');
    return;
  }

  console.log(
    `\n${dryRun ? '[DRY RUN] ' : ''}${users.length} kullanıcı işlenecek:\n`,
  );

  // Davet'i kim gönderdi olarak işaretleyeceğiz — ilk SUPER_ADMIN'i bul,
  // o da yoksa kullanıcının kendisini koy (createInvitation invitedById
  // require ediyor).
  const sysAdmin = users.find((u) => u.role === 'SUPER_ADMIN') ?? users[0];

  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';

  for (const u of users) {
    console.log(`  • ${u.email} (${u.role}) — ${u.name}`);

    if (dryRun) continue;

    // 1) Şifreyi geçersiz kıl + mustSetPassword set et
    await prisma.user.update({
      where: { id: u.id },
      data: {
        password: PLACEHOLDER_HASH,
        mustSetPassword: true,
      },
    });

    // 2) Yeni davet token'ı üret. createInvitation zaten varolan
    //    açık davetleri invalidate ediyor.
    const invitation = await createInvitation({
      userId: u.id,
      invitedById: sysAdmin.id,
    });

    const url = `${baseUrl}/admin/accept-invite?token=${invitation.rawToken}`;
    console.log(`    → ${url}`);
  }

  console.log(
    dryRun
      ? '\n[DRY RUN] Hiçbir değişiklik yapılmadı.\n'
      : '\nTamamlandı. URL\'leri ilgili kullanıcılara güvenli kanaldan gönder.\n' +
          'Tokenlar 48 saat geçerli. Süresi dolanlar için scripti tekrar çalıştır.\n',
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
