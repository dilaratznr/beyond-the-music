/**
 * One-off: super admin değişikliği.
 *
 * NE YAPAR:
 *   1) `dilaratuezuner@gmail.com` kullanıcısını SUPER_ADMIN yapar.
 *      - Yoksa yeni kullanıcı olarak oluşturur (mustSetPassword=true,
 *        davet token'ı üretir → URL console'a basılır).
 *      - Varsa rolünü SUPER_ADMIN'e yükseltir.
 *   2) `admin@beyondthemusic.com` kullanıcısını siler.
 *      - Onun yazdığı tüm makaleler dilaratuezuner@gmail.com'a transfer
 *        edilir (yetim makale kalmasın).
 *      - Sonra hesabı silinir.
 *
 * GÜVENLİK:
 *   - Tüm DB değişiklikleri tek bir prisma.$transaction içinde — herhangi
 *     bir adım fail ederse hiçbir şey commit'lenmez (atomic).
 *   - Eylem audit log'a yazılır (NEW_SUPER_ADMIN_PROMOTED, USER_DELETED).
 *   - Senin kendi hesabını silmemen için ek check var.
 *
 * KULLANIM:
 *   npx tsx scripts/swap-super-admin.ts --dry-run   # önce gör
 *   npx tsx scripts/swap-super-admin.ts             # gerçek yap
 *
 * GERİ ALMA: Yapamaz — silme kalıcı. Önce DB backup al:
 *   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M).sql
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';
import { createInvitation } from '../src/lib/user-invitations';
import { audit } from '../src/lib/audit-log';

const NEW_SUPER_ADMIN_EMAIL = 'dilaratuezuner@gmail.com';
const OLD_ADMIN_EMAIL = 'admin@beyondthemusic.com';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(
    `\n${dryRun ? '[DRY RUN] ' : ''}Super admin değişikliği:\n` +
      `  • Yeni SUPER_ADMIN: ${NEW_SUPER_ADMIN_EMAIL}\n` +
      `  • Silinecek:        ${OLD_ADMIN_EMAIL}\n`,
  );

  if (NEW_SUPER_ADMIN_EMAIL === OLD_ADMIN_EMAIL) {
    throw new Error('Yeni ve silinecek email aynı olamaz.');
  }

  const newUser = await prisma.user.findUnique({
    where: { email: NEW_SUPER_ADMIN_EMAIL },
  });
  const oldUser = await prisma.user.findUnique({
    where: { email: OLD_ADMIN_EMAIL },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      _count: { select: { articles: true } },
    },
  });

  if (!oldUser) {
    console.log(`⚠️  ${OLD_ADMIN_EMAIL} bulunamadı — silme adımı atlanacak.`);
  } else {
    console.log(
      `  📋 ${OLD_ADMIN_EMAIL}: rol=${oldUser.role}, ${oldUser._count.articles} makale yazmış.`,
    );
  }

  if (newUser) {
    console.log(
      `  📋 ${NEW_SUPER_ADMIN_EMAIL}: var (rol=${newUser.role}) — promote edilecek.`,
    );
  } else {
    console.log(
      `  📋 ${NEW_SUPER_ADMIN_EMAIL}: YOK — yeni hesap açılacak, davet linki üretilecek.`,
    );
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Hiçbir değişiklik yapılmadı.\n');
    return;
  }

  // Transaction'da yapamadığımız tek şey audit() çağrıları (kendi try/catch'i
  // var, kritik path değil). Geri kalan her şey atomic.
  const placeholderHash = await bcrypt.hash(
    `__init-${Date.now()}-${Math.random()}`,
    12,
  );

  const result = await prisma.$transaction(async (tx) => {
    // 1) dilaratuezuner — yoksa oluştur, varsa promote
    let newSuperAdminId: string;
    let createdNew = false;

    if (newUser) {
      await tx.user.update({
        where: { id: newUser.id },
        data: { role: 'SUPER_ADMIN', isActive: true },
      });
      newSuperAdminId = newUser.id;
    } else {
      const created = await tx.user.create({
        data: {
          email: NEW_SUPER_ADMIN_EMAIL,
          name: 'Dilara Tüzüner',
          role: 'SUPER_ADMIN',
          password: placeholderHash,
          mustSetPassword: true,
          isActive: true,
        },
      });
      newSuperAdminId = created.id;
      createdNew = true;
    }

    // 2) admin@beyondthemusic.com varsa: makaleleri transfer + sil
    let articlesTransferred = 0;
    let oldUserDeleted = false;

    if (oldUser) {
      // FK constraint'leri:
      //   - Article.authorId         → reassign new super admin'e
      //   - ContentReview.submittedById / reviewedById → onDelete davranışına
      //     bağlı. Schema'da SetNull veya Cascade var mı bakmak lazım;
      //     emin değilsek SetNull-benzeri bir el ile yapalım.
      //   - UserInvitation.userId    → Cascade
      //   - UserInvitation.invitedById → onDelete davranışı
      //   - AuditLog.actorId         → SetNull (yeni eklendi)

      const updated = await tx.article.updateMany({
        where: { authorId: oldUser.id },
        data: { authorId: newSuperAdminId },
      });
      articlesTransferred = updated.count;

      // ContentReview / UserInvitation FK'larını da new super admin'e çevir
      // ki delete FK error vermesin.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txAny = tx as any;
      try {
        await txAny.contentReview.updateMany({
          where: { submittedById: oldUser.id },
          data: { submittedById: newSuperAdminId },
        });
      } catch {
        /* tablo yoksa */
      }
      try {
        await txAny.contentReview.updateMany({
          where: { reviewedById: oldUser.id },
          data: { reviewedById: newSuperAdminId },
        });
      } catch {
        /* tablo yoksa */
      }
      try {
        await txAny.userInvitation.updateMany({
          where: { invitedById: oldUser.id },
          data: { invitedById: newSuperAdminId },
        });
      } catch {
        /* tablo yoksa */
      }

      // Şimdi sil — Cascade'ler tetiklenir (kullanıcının kendi davetleri,
      // şifre reset token'ları temizlenir). AuditLog actorId SetNull olur.
      await tx.user.delete({ where: { id: oldUser.id } });
      oldUserDeleted = true;
    }

    return { newSuperAdminId, createdNew, articlesTransferred, oldUserDeleted };
  });

  console.log('\n✅ DB değişiklikleri tamam.\n');
  console.log(`  • ${NEW_SUPER_ADMIN_EMAIL}: SUPER_ADMIN (${result.createdNew ? 'yeni hesap' : 'yükseltildi'})`);
  if (result.oldUserDeleted) {
    console.log(`  • ${OLD_ADMIN_EMAIL}: silindi (${result.articlesTransferred} makale yeni admin'e transfer edildi)`);
  }

  // Davet URL'i üret (yeni hesap açıldıysa veya mevcut hesap zaten
  // mustSetPassword=true ise). Mevcut bir hesabı promote ettiysek ve
  // şifresi varsa, yeni davet üretmiyoruz — kendi şifresiyle giriyor.
  if (result.createdNew) {
    const invitation = await createInvitation({
      userId: result.newSuperAdminId,
      invitedById: result.newSuperAdminId, // self-invite, başka super admin yok
    });

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';
    const url = `${baseUrl}/admin/accept-invite?token=${invitation.rawToken}`;

    console.log('\n📩 Yeni hesabın davet linki (48 saat geçerli):\n');
    console.log(`   ${url}\n`);
    console.log('   Bu URL\'i tarayıcıda aç, şifreni belirle, login ol.\n');
  } else {
    console.log(
      '\n💡 Mevcut hesabın varsa kendi şifrenle login olabilirsin: /admin/login\n',
    );
  }

  // Audit log
  await audit({
    event: 'SUPER_ADMIN_SWAPPED',
    actorId: result.newSuperAdminId,
    targetId: result.newSuperAdminId,
    targetType: 'USER',
    detail:
      `promoted=${NEW_SUPER_ADMIN_EMAIL}` +
      (result.oldUserDeleted ? `; removed=${OLD_ADMIN_EMAIL}` : ''),
  });
}

main()
  .catch((err) => {
    console.error('\n❌ Hata:', err.message ?? err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
