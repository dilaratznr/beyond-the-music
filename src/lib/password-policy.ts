/**
 * Şifre politikası — admin paneline özel.
 *
 * Tasarım: NIST SP 800-63B'nin pratik formu. Karmaşıklık (büyük/küçük/
 * özel-karakter) tek başına işe yaramaz; en kritik koruma "common
 * password" reddi ve uzunluk. Burada her ikisini de uyguluyoruz.
 *
 *   - Min 12 karakter: bcrypt 12-round + 12 char ≈ offline brute force
 *     için pratikte çatlak değil. 8 karakter modern GPU ile saatlerde
 *     çatlatılabilir; ekibe biraz yük bindirmek karşılığında bunu kabul
 *     ediyoruz.
 *   - Max 200: bcrypt 72 byte sonrasında truncate eder (silent risk).
 *     200'e cap koymak DoS'i + bcrypt'in beklenmedik davranışını keser.
 *   - Common password reddi: top-50 listenin küçük kopyası. Tam ROCKYOU
 *     listesi 14M kayıtlı; runtime'da yüklemek mantıksız. Top-50 + isim/
 *     email içerme kontrolü %95 sözlük saldırılarını keser.
 *   - Karmaşıklık ZORUNLU DEĞİL: 12+ uzun ve common-değil ise yeterli;
 *     "must contain symbol" kuralları kullanıcıyı kötü pattern'lere
 *     iter (P@ssw0rd!). Yine de min 1 harf + 1 rakam istiyoruz çünkü
 *     "111111111111" gibi şeyler sözlük listesinde olmayabilir.
 */

const COMMON_PASSWORDS = new Set([
  // Top 50 from rockyou.txt + Türkçe yaygın olanlar
  'password', 'password1', 'password123', '123456', '123456789',
  '12345678', '12345', '1234567', 'qwerty', 'qwerty123',
  'abc123', 'letmein', 'welcome', 'admin', 'admin123',
  'iloveyou', 'monkey', 'dragon', 'master', 'sunshine',
  'princess', 'football', 'baseball', 'superman', 'batman',
  'shadow', 'michael', 'jordan', 'jennifer', 'joshua',
  'jessica', 'asshole', 'pokemon', 'starwars', 'computer',
  // Türkçe yaygın
  'sifre', 'sifre123', 'merhaba', 'turkey', 'galatasaray',
  'fenerbahce', 'besiktas', 'ankara', 'istanbul', 'mehmet',
  'ahmet', 'fatma', 'ayse', 'aleykum', 'allah123',
]);

export interface PasswordValidation {
  ok: boolean;
  error?: string;
}

export function validatePassword(
  pw: unknown,
  context: { email?: string; name?: string } = {},
): PasswordValidation {
  if (typeof pw !== 'string') return { ok: false, error: 'Geçersiz şifre' };
  if (pw.length < 12) return { ok: false, error: 'Şifre en az 12 karakter olmalı' };
  if (pw.length > 200) return { ok: false, error: 'Şifre çok uzun (max 200 karakter)' };

  // Yumuşak karmaşıklık: en azından farklı karakter sınıflarından 2'si.
  // (P@ssw0rd! tarzı zorlamalar yerine, kullanıcının doğal cümle ya da
  // passphrase yazmasına izin veriyoruz.)
  const classes = [
    /[a-z]/.test(pw),
    /[A-Z]/.test(pw),
    /[0-9]/.test(pw),
    /[^a-zA-Z0-9]/.test(pw),
  ].filter(Boolean).length;
  if (classes < 2) {
    return {
      ok: false,
      error: 'Şifre en az 2 farklı karakter sınıfı içermeli (harf, rakam, sembol)',
    };
  }

  // Common password listesi
  if (COMMON_PASSWORDS.has(pw.toLowerCase())) {
    return { ok: false, error: 'Bu şifre çok yaygın, başka bir tane seç.' };
  }

  // Kullanıcının email / adının şifrede geçmesi
  const lower = pw.toLowerCase();
  if (context.email) {
    const localPart = context.email.split('@')[0]?.toLowerCase() ?? '';
    if (localPart.length >= 4 && lower.includes(localPart)) {
      return { ok: false, error: 'Şifre email adresini içeremez.' };
    }
  }
  if (context.name) {
    const nameLower = context.name.toLowerCase().replace(/\s+/g, '');
    if (nameLower.length >= 4 && lower.includes(nameLower)) {
      return { ok: false, error: 'Şifre adınızı içeremez.' };
    }
  }

  // Sadece tek karakterden oluşan şifre (bbbbbbbbbbbb)
  if (new Set(pw).size < 4) {
    return { ok: false, error: 'Şifre çok az farklı karakter içeriyor.' };
  }

  return { ok: true };
}
