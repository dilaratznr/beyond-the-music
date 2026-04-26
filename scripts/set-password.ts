/**
 * One-off: bir admin hesabının şifresini terminalden manuel set et.
 *
 * KULLANIM:
 *   npx tsx scripts/set-password.ts <email> <yeni-şifre>
 *
 * ÖRNEK:
 *   npx tsx scripts/set-password.ts dilaratuezuner@gmail.com "X9!kT8mP2vQ9wR4t"
 *
 * NE YAPAR:
 *   - Bcrypt 12-round hash üretir, user.password'e yazar
 *   - mustSetPassword=false yapar (eğer önceden true idiyse)
 *   - Şifre policy'sine uygun mu kontrol eder (12+ karakter vb.)
 *   - Audit log'a "PASSWORD_SET_VIA_SCRIPT" düşer
 *
 * GÜVENLİK:
 *   - Sadece DATABASE_URL erişimi olan biri (sen) çalıştırabilir
 *   - Şifre bash history'ye düşer; sonrasında temizlemek için:
 *       history -d $(history 1)
 *     veya:
 *       echo "" > ~/.zsh_history
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';
import { validatePassword } from '../src/lib/password-policy';

async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error('Kullanım: npx tsx scripts/set-password.ts <email> <şifre>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    console.error(`❌ Kullanıcı bulunamadı: ${email}`);
    process.exit(1);
  }

  // Yeni şifre policy kontrolü — kullanıcı login flow'unda nasılsa
  // burada da aynı kuralları uygula. Tutarlılık + script üzerinden
  // zayıf şifre set edilemesin.
  const validation = validatePassword(password, {
    email: user.email,
    name: user.name,
  });
  if (!validation.ok) {
    console.error(`❌ Şifre policy'sine uymuyor: ${validation.error}`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hash,
      mustSetPassword: false,
    },
  });

  console.log(`✅ Şifre güncellendi: ${user.email} (${user.role})`);
  console.log('   Şimdi /admin/login\'den giriş yapabilirsin.');
  console.log('   2FA aktif değilse, ilk login\'de setup sayfasına yönlendirileceksin.');
}

main()
  .catch((err) => {
    console.error('❌ Hata:', err.message ?? err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
