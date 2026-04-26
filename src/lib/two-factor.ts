/**
 * 2FA (TOTP — RFC 6238). 6-digit, 30s window, SHA-1 (Authenticator compat).
 * Window ±1 for clock skew. Secret 160-bit base32. AES-256-GCM encryption
 * via HKDF(NEXTAUTH_SECRET). Backup codes 8-char base32 base, hashed in DB.
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
  // HKDF derives consistent key; "2fa-secret-v1" info prevents key collision.
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
