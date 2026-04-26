/**
 * 2FA (TOTP — RFC 6238) helper'ları.
 *
 * Tasarım kararları:
 *   - TOTP: 6 haneli kod, 30s pencere, SHA-1 (Authenticator app uyumluluğu).
 *     SHA-256 daha güçlü ama Google Authenticator default olarak SHA-1
 *     kullanır → uyumluluk için bunu seçiyoruz.
 *   - Window: ±1 (önceki + şu anki + sonraki kod) — saat senkron olmayan
 *     telefonlarda da çalışsın diye. ±1 endüstri standardı.
 *   - Secret: 20 byte (160 bit) random, base32 string — TOTP standardı.
 *   - Encryption: AES-256-GCM. Key = HKDF(NEXTAUTH_SECRET, "2fa-secret-v1").
 *     Format: hex(iv) + ":" + hex(ciphertext) + ":" + hex(authTag).
 *     GCM auth tag'i tampering'i tespit eder — secret'a dokunulduysa
 *     decrypt fail eder.
 *   - Backup code: 8 karakter base32 (A-Z, 2-7), kullanıcıya `XXXX-XXXX`
 *     formatında gösterilir, DB'de hash'li tutulur (raw asla saklanmaz).
 *
 * Bu lib SADECE server-side. Client'a otpauth bundle'lamıyoruz.
 */

import crypto from 'node:crypto';
import * as OTPAuth from 'otpauth';

const TOTP_ISSUER = 'Beyond The Music';
const SECRET_BYTES = 20; // 160 bit — RFC 6238 önerisi
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const BACKUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 0/O/1/I çıkarıldı (kullanıcı hatası)

// ─── Encryption helpers ─────────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const seed = process.env.NEXTAUTH_SECRET;
  if (!seed) {
    throw new Error(
      '2FA: NEXTAUTH_SECRET env zorunlu. Set edilmeden 2FA secret\'ları encrypt edilemez.',
    );
  }
  // HKDF ile NEXTAUTH_SECRET'tan 32 byte AES key türet. Aynı seed
  // → aynı key, ama "2fa-secret-v1" info'su NextAuth'un kendi token
  // imzalama key'iyle çakışmasını engeller (key separation).
  return Buffer.from(
    crypto.hkdfSync('sha256', Buffer.from(seed), Buffer.alloc(0), '2fa-secret-v1', 32),
  );
}

function encryptSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // GCM standard 96-bit
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), encrypted.toString('hex'), authTag.toString('hex')].join(':');
}

function decryptSecret(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 3) throw new Error('Invalid 2FA secret payload');
  const [ivHex, ctHex, tagHex] = parts;
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ctHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// ─── TOTP setup + verify ────────────────────────────────────────────

export interface TwoFactorSetup {
  secretEncrypted: string; // DB'ye yazılacak format
  otpauthUrl: string;       // QR kod için
}

/**
 * Yeni TOTP secret üret + DB'ye yazılacak şifreli payload + QR URL hazırla.
 * Kullanıcı setup ekranında görür → uygulamasında tarar → ilk kodu girer.
 */
export function generateTwoFactorSetup(accountLabel: string): TwoFactorSetup {
  const secret = new OTPAuth.Secret({ size: SECRET_BYTES });
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: accountLabel,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });
  return {
    secretEncrypted: encryptSecret(secret.base32),
    otpauthUrl: totp.toString(),
  };
}

/**
 * Kullanıcının girdiği 6 haneli kodu doğrula.
 * window=1 → ±30s tolerans (clock skew için).
 */
export function verifyTotpCode(secretEncrypted: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const secret = decryptSecret(secretEncrypted);
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: 'verify',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

// ─── Backup codes ───────────────────────────────────────────────────

/**
 * Kriptografik olarak güçlü rastgele backup kod üret.
 * Base32 alphabet (kullanıcı dostu), 8 karakter → 32^8 ≈ 10^12 kombinasyon.
 */
function generateBackupCodeRaw(): string {
  const bytes = crypto.randomBytes(BACKUP_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
    code += BACKUP_CODE_ALPHABET[bytes[i] % BACKUP_CODE_ALPHABET.length];
  }
  return code;
}

/** Kullanıcıya gösterilen format: `ABCD-EFGH` */
export function formatBackupCode(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function hashBackupCode(raw: string): string {
  // Raw'dan tire'ları strip et, normalize et — kullanıcı `abcd-efgh` ya da
  // `ABCDEFGH` yazabilir, ikisi de geçerli olmalı.
  const normalized = raw.replace(/[\s-]/g, '').toUpperCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * 10 yeni backup kodu üret. Caller bunları DB'ye `hashBackupCode`'lu
 * şekilde yazar VE kullanıcıya raw'larını TEK SEFER gösterir.
 */
export function generateBackupCodes(): { raw: string[]; hashes: string[] } {
  const raw: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = generateBackupCodeRaw();
    raw.push(formatBackupCode(code));
    hashes.push(hashBackupCode(code));
  }
  return { raw, hashes };
}
