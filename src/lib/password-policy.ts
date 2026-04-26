/**
 * Admin password policy per NIST SP 800-63B. Min 12 char (bcrypt-safe),
 * max 200 (truncation safety), no common passwords, no email/name.
 * Soft complexity: 2+ character classes (not required, discourages bad patterns).
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
  context: { email?: string | null; username?: string | null; name?: string } = {},
): PasswordValidation {
  if (typeof pw !== 'string') return { ok: false, error: 'Geçersiz şifre' };
  if (pw.length < 12) return { ok: false, error: 'Şifre en az 12 karakter olmalı' };
  if (pw.length > 200) return { ok: false, error: 'Şifre çok uzun (max 200 karakter)' };

  // Soft complexity: min 2 character classes (allow natural passphrases).
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

  // Reject if email local part or name appears in password.
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
  if (context.username) {
    const u = context.username.toLowerCase();
    if (u.length >= 4 && lower.includes(u)) {
      return { ok: false, error: 'Şifre kullanıcı adınızı içeremez.' };
    }
  }

  // Reject trivial repetition (e.g., "bbbbbbbbbbbb").
  if (new Set(pw).size < 4) {
    return { ok: false, error: 'Şifre çok az farklı karakter içeriyor.' };
  }

  return { ok: true };
}
