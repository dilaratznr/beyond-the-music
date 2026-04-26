/**
 * One-off migration: User'a `username` kolonu ekler ve mevcut kullanıcılar
 * için email'den otomatik üretir.
 *
 * Schema'da `username String @unique` (NOT NULL) tanımlandığı için bu
 * script idempotent şekilde:
 *   1. Kolonu nullable olarak ekler (zaten varsa atlar)
 *   2. Username'i olmayan tüm kullanıcılar için email'den üretir
 *      (collision varsa `_2`, `_3` ekler)
 *   3. NOT NULL + UNIQUE constraint'lerini ekler
 *   4. Email'i nullable yapar (yeni davet akışında opsiyonel)
 *
 * KULLANIM:
 *   npx tsx scripts/migrate-add-username.ts
 *   npx prisma generate   # Prisma client'a username alanını tanıt
 *
 * GERİ ALMA: yapamaz — backfill kalıcı. Önce DB backup al:
 *   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M).sql
 */

import 'dotenv/config';
import prisma from '../src/lib/prisma';

const USERNAME_FORMAT = /^[a-z0-9_-]{3,30}$/;

/** Email local-part'ı veya 'user' kelimesini username formatına dönüştür. */
function deriveUsername(email: string | null | undefined, userId: string): string {
  const localPart = (email ?? '').split('@')[0] ?? '';
  // Sadece [a-z0-9_-] karakterleri tut, geri kalanı `_`'ye çevir.
  let base = localPart
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '')
    .slice(0, 24);

  // Kısa veya boş kalırsa user id'nin son 8 karakteri ile fallback.
  if (base.length < 3) {
    base = `user_${userId.slice(-8).toLowerCase()}`;
  }
  return base;
}

async function main() {
  console.log('→ Migration başlıyor: User.username ekleniyor\n');

  // 0) Fresh DB toleransı: User tablosu yoksa hiç işlem yapma. Bu durumda
  //    `prisma db push` baştan doğru schema'yı (username NOT NULL UNIQUE)
  //    oluşturacak ve migration'a gerek kalmayacak.
  const tableCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'User'
     ) AS exists`,
  );
  if (!tableCheck[0]?.exists) {
    console.log('  • User tablosu henüz yok — fresh DB, migration atlandı.');
    console.log('  ✓ db:push schema\'yı oluşturacak.');
    return;
  }

  // 0.1) Kolon zaten varsa (önceki migration başarılı tamamlandı) bir
  //      şey yapma. Bu erken çıkış build'in her seferinde script'i
  //      çalıştırmasını ucuz yapar.
  const colCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'username'
     ) AS exists`,
  );
  if (colCheck[0]?.exists) {
    console.log('  ✓ User.username zaten mevcut — migration atlandı.\n');
    return;
  }

  // 1) Kolonu nullable olarak ekle (idempotent)
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT`,
  );
  console.log('  ✓ Kolon eklendi (nullable)');

  // 2) Mevcut user'ları çek
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; email: string | null; username: string | null }>
  >(`SELECT id, email, username FROM "User" ORDER BY "createdAt" ASC`);
  console.log(`  • DB'de toplam ${rows.length} kullanıcı`);

  // 3) Mevcut username'leri topla (collision için)
  const taken = new Set<string>();
  for (const row of rows) {
    if (row.username) taken.add(row.username.toLowerCase());
  }

  // 4) Username'siz kayıtları işle
  const toBackfill = rows.filter((r) => !r.username);
  let updated = 0;
  for (const user of toBackfill) {
    const base = deriveUsername(user.email, user.id);
    let candidate = base;
    let i = 2;
    while (taken.has(candidate)) {
      candidate = `${base}_${i}`;
      i++;
      if (candidate.length > 30) {
        // Aşırı uzun olursa user id ile fallback
        candidate = `user_${user.id.slice(-8).toLowerCase()}`;
        if (taken.has(candidate)) {
          throw new Error(`Username üretilemedi: ${user.id}`);
        }
        break;
      }
    }
    if (!USERNAME_FORMAT.test(candidate)) {
      throw new Error(
        `Üretilen username format'a uymuyor: "${candidate}" (user ${user.id})`,
      );
    }
    taken.add(candidate);
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET username = $1 WHERE id = $2`,
      candidate,
      user.id,
    );
    console.log(`    ${user.email ?? '(no email)'} → ${candidate}`);
    updated++;
  }
  console.log(`  ✓ ${updated} kullanıcı için username üretildi`);

  // 5) NOT NULL + UNIQUE constraint
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")`,
  );
  console.log('  ✓ NOT NULL + UNIQUE constraint eklendi');

  // 6) Email'i nullable yap (yeni davet akışı için)
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL`,
  );
  console.log('  ✓ Email NULL kabul ediyor\n');

  console.log('✅ Migration tamamlandı.');
  console.log('   Sıradaki: `npx prisma generate` ile Prisma client\'ı yenile.');
}

main()
  .catch((err) => {
    console.error('\n❌ Hata:', err.message ?? err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
