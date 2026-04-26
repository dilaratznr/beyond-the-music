/**
 * One-off: bir admin hesabının şifresini terminalden manuel set et.
 *
 * KULLANIM:
 *   npx tsx scripts/set-password.ts <kullanıcı-adı-veya-email> <yeni-şifre>
 *
 * ÖRNEK:
 *   npx tsx scripts/set-password.ts admin "<güçlü-şifre>"
 *   npx tsx scripts/set-password.ts admin@example.com "<güçlü-şifre>"
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';
import { validatePassword } from '../src/lib/password-policy';
import { findUserByIdentifier } from '../src/lib/user-lookup';

async function main() {
  const [identifier, password] = process.argv.slice(2);

  if (!identifier || !password) {
    console.error(
      'Kullanım: npx tsx scripts/set-password.ts <kullanıcı-adı-veya-email> <şifre>',
    );
    process.exit(1);
  }

  const user = await findUserByIdentifier(identifier);
  if (!user) {
    console.error(`❌ Kullanıcı bulunamadı: ${identifier}`);
    process.exit(1);
  }

  const validation = validatePassword(password, {
    email: user.email,
    username: user.username,
    name: user.name,
  });
  if (!validation.ok) {
    console.error(`❌ Şifre policy'sine uymuyor: ${validation.error}`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash, mustSetPassword: false },
  });

  console.log(`✅ Şifre güncellendi: @${user.username} (${user.role})`);
  console.log('   Şimdi /admin/login\'den giriş yapabilirsin.');
}

main()
  .catch((err) => {
    console.error('❌ Hata:', err.message ?? err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
