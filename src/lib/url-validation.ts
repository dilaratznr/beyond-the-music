/**
 * Server-side URL validation (images, links). Allows relative paths and
 * http(s) URLs; blocks javascript:, data:, protocol-relative (//evil.com).
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

  // Protocol-relative (//evil.com) — browser inherits current scheme.
  if (trimmed.startsWith('//')) {
    return { ok: false, error: 'Protocol-relative URL kabul edilmiyor.' };
  }

  // Relative path → OK (own server). Prevent path traversal (../).
  if (trimmed.startsWith('/')) {
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
 * Open-redirect protection: login callback URL must be internal path (/).
 * Blocks protocol-relative, absolute URLs, traversal, backslash/control chars.
 */
export function validateInternalRedirect(input: string): string {
  const FALLBACK = '/admin/dashboard';
  if (!input) return FALLBACK;
  if (typeof input !== 'string') return FALLBACK;

  const trimmed = input.trim();
  if (trimmed.startsWith('//')) return FALLBACK;  // Protocol-relative
  if (!trimmed.startsWith('/')) return FALLBACK;   // Must be absolute path
  if (trimmed.includes('..')) return FALLBACK;      // Path traversal
  if (trimmed.includes('\\')) return FALLBACK;      // Backslash injection
  if (/[\x00-\x1f]/.test(trimmed)) return FALLBACK; // Control chars
  return trimmed;
}
