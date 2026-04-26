import { describe, it, expect, beforeEach } from 'vitest';
import * as OTPAuth from 'otpauth';
import {
  generateTwoFactorSetup,
  verifyTotpCode,
  generateBackupCodes,
  hashBackupCode,
  formatBackupCode,
} from '@/lib/two-factor';

/**
 * 2FA test'leri — kritik invariantlar:
 *   - Encrypt → decrypt roundtrip aynı secret'ı verir
 *   - Doğru TOTP kodu kabul edilir, yanlış reddedilir
 *   - Backup kod üretimi 10 unique kod verir
 *   - Hash deterministic — aynı kod aynı hash'e gider, normalize çalışır
 *
 * NEXTAUTH_SECRET test'lerde gerekli (encryption key seed) — beforeEach'de
 * stable bir değer veriyoruz, böylece tests'ler izole.
 */

beforeEach(() => {
  process.env.NEXTAUTH_SECRET =
    'test-secret-32-chars-long-stable-value-for-tests-only';
});

describe('generateTwoFactorSetup + verifyTotpCode', () => {
  it('üretilen setup geçerli otpauth URL ve secret döner', () => {
    const setup = generateTwoFactorSetup('test@example.com');
    expect(setup.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    expect(setup.otpauthUrl).toContain('Beyond%20The%20Music');
    expect(setup.secretEncrypted.split(':')).toHaveLength(3); // iv:ct:tag
  });

  it('üretilen secret\'la verify edilen kod kabul edilir (roundtrip)', () => {
    const setup = generateTwoFactorSetup('test@example.com');

    // Setup URL'inden secret'ı parse et, mevcut TOTP kodunu üret,
    // sonra bizim verifyTotpCode'umuza ver — geçmesi lazım.
    const url = new URL(setup.otpauthUrl);
    const base32Secret = url.searchParams.get('secret')!;
    const totp = new OTPAuth.TOTP({
      issuer: 'Beyond The Music',
      label: 'test',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(base32Secret),
    });
    const code = totp.generate();

    expect(verifyTotpCode(setup.secretEncrypted, code)).toBe(true);
  });

  it('yanlış kodu reddeder', () => {
    const setup = generateTwoFactorSetup('test@example.com');
    expect(verifyTotpCode(setup.secretEncrypted, '000000')).toBe(false);
    expect(verifyTotpCode(setup.secretEncrypted, '123456')).toBe(false);
  });

  it('non-numeric input reddedilir', () => {
    const setup = generateTwoFactorSetup('test@example.com');
    expect(verifyTotpCode(setup.secretEncrypted, 'abcdef')).toBe(false);
    expect(verifyTotpCode(setup.secretEncrypted, '12345')).toBe(false); // 5 hane
    expect(verifyTotpCode(setup.secretEncrypted, '1234567')).toBe(false); // 7 hane
  });

  it('tampered secret payload decrypt edemez', () => {
    const setup = generateTwoFactorSetup('test@example.com');
    // ciphertext'in son karakterini değiştir → GCM auth tag fail eder
    const parts = setup.secretEncrypted.split(':');
    parts[1] = parts[1].slice(0, -1) + (parts[1].slice(-1) === 'a' ? 'b' : 'a');
    const tampered = parts.join(':');
    // verifyTotpCode içinden decrypt fail edip throw etmeli
    expect(() => verifyTotpCode(tampered, '123456')).toThrow();
  });
});

describe('Backup codes', () => {
  it('10 unique kod üretir', () => {
    const { raw, hashes } = generateBackupCodes();
    expect(raw).toHaveLength(10);
    expect(hashes).toHaveLength(10);
    expect(new Set(raw).size).toBe(10);
    expect(new Set(hashes).size).toBe(10);
  });

  it('format XXXX-XXXX', () => {
    const { raw } = generateBackupCodes();
    for (const code of raw) {
      expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    }
  });

  it('formatBackupCode tire ekler', () => {
    expect(formatBackupCode('ABCDEFGH')).toBe('ABCD-EFGH');
  });

  it('hash deterministic — aynı kod aynı hash', () => {
    expect(hashBackupCode('ABCD-EFGH')).toBe(hashBackupCode('ABCD-EFGH'));
  });

  it('hash normalize: tire/boşluk/case farkı önemli değil', () => {
    const expected = hashBackupCode('ABCDEFGH');
    expect(hashBackupCode('abcd-efgh')).toBe(expected);
    expect(hashBackupCode(' abcd efgh ')).toBe(expected);
    expect(hashBackupCode('ABCD-EFGH')).toBe(expected);
  });

  it('hash 64 hex karakter (SHA-256)', () => {
    const h = hashBackupCode('TESTCODE');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('Encryption requires NEXTAUTH_SECRET', () => {
  it('NEXTAUTH_SECRET yoksa setup throw eder', () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(() => generateTwoFactorSetup('test@example.com')).toThrow(
      /NEXTAUTH_SECRET/,
    );
  });
});
