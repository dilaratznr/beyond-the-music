/**
 * URL alanları (image, featuredImage, link href) için server-side
 * validation. Saldırgan admin paneline form post ederken `javascript:`,
 * `data:`, veya kendi domain'ini başkasının yerine yazabilir → render
 * katmanı bunu DOM'a basarsa XSS / phishing / SSRF.
 *
 * Kabul edilen format'lar:
 *   - `/relative/path`         (kendi domain'imiz, upload'lar buradan gelir)
 *   - `https://...`            (CDN, R2 public domain)
 *   - `http://...`             (sadece localhost dev için; production'da
 *                              CSP `upgrade-insecure-requests` zaten zorlar)
 *
 * Reddedilen:
 *   - `javascript:`, `data:`, `vbscript:`, `file:` → XSS / desktop-app SSRF
 *   - Protocol-relative `//evil.com` → hostname kaçırma
 */

export interface UrlValidation {
  ok: boolean;
  error?: string;
}

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

export function validateImageUrl(input: unknown): UrlValidation {
  if (input == null || input === '') return { ok: true }; // boş = OK
  if (typeof input !== 'string') {
    return { ok: false, error: 'URL string olmalı.' };
  }

  const trimmed = input.trim();

  // Protocol-relative URL (//evil.com/x.png) → reddet, çünkü
  // tarayıcı current scheme ile birleştirir ve kontrolü kaybederiz.
  if (trimmed.startsWith('//')) {
    return { ok: false, error: 'Protocol-relative URL kabul edilmiyor.' };
  }

  // Relative path (/uploads/x.png) → OK, kendi sunucumuzdaki içerik.
  if (trimmed.startsWith('/')) {
    // Path traversal'i kes — `/../etc/passwd` gibi
    if (trimmed.includes('..')) {
      return { ok: false, error: 'Geçersiz yol.' };
    }
    return { ok: true };
  }

  // Absolute URL → protokol kontrol et
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Geçersiz URL.' };
  }

  if (!SAFE_PROTOCOLS.has(url.protocol)) {
    return {
      ok: false,
      error: `Sadece http:// ve https:// kabul ediliyor (gönderilen: ${url.protocol}).`,
    };
  }

  return { ok: true };
}

/**
 * Login callback URL'i için sıkı kontrol — açık-redirect koruması.
 * Sadece `/admin/...` veya `/[locale]/...` formundaki INTERNAL path'lere
 * izin var. Protocol-relative ve absolute URL hep reddediliyor.
 */
export function validateInternalRedirect(input: string): string {
  const FALLBACK = '/admin/dashboard';
  if (!input) return FALLBACK;
  if (typeof input !== 'string') return FALLBACK;

  const trimmed = input.trim();
  // Protocol-relative — `//attacker.com/...` tarayıcıda absolute olur
  if (trimmed.startsWith('//')) return FALLBACK;
  // Mutlak path olmalı
  if (!trimmed.startsWith('/')) return FALLBACK;
  // Path traversal koruması
  if (trimmed.includes('..')) return FALLBACK;
  // Backslash injection (bazı browser'larda `/\evil.com` `//evil.com`'a normalize olur)
  if (trimmed.includes('\\')) return FALLBACK;
  // Newline / control char injection
  if (/[\x00-\x1f]/.test(trimmed)) return FALLBACK;
  return trimmed;
}
