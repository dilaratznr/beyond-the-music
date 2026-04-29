/**
 * Server-side URL validation (images, links). Allows relative paths and
 * http(s) URLs; blocks javascript:, data:, protocol-relative (//evil.com).
 */

export interface UrlValidation {
  ok: boolean;
  error?: string;
}

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * SSRF guard: external image URL fetch'i internal/cloud-metadata adreslerine
 * yönlendirilemesin. Saldırgan admin paneline geçici de olsa erişse veya
 * canPublish'siz bir editor olsa bile, `featuredImage`'i AWS metadata
 * service'ine (169.254.169.254) işaret ettirip cloud credential'ları
 * çıkartamaz.
 *
 * Engellenen aralıklar:
 *   - 127.0.0.0/8     (localhost)
 *   - 10.0.0.0/8      (private)
 *   - 172.16.0.0/12   (private)
 *   - 192.168.0.0/16  (private)
 *   - 169.254.0.0/16  (link-local + AWS/GCP metadata)
 *   - 0.0.0.0         (any-host)
 *   - ::1, fc00::/7   (IPv6 localhost + ULA)
 *   - localhost / *.local / *.internal hostnames
 *
 * NOT: DNS rebinding'e karşı tam koruma vermiyor (Next.js Image servisi
 * fetch zamanı tekrar resolve eder). Tam koruma için fetch sırasında
 * resolve edilen IP'yi de kontrol etmek gerekir; şimdilik public domain
 * gerektiren kullanım için yeterli barikat.
 */
function isPrivateOrLoopback(hostname: string): boolean {
  const h = hostname.toLowerCase();

  // Hostname blocklist
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.endsWith('.local') || h.endsWith('.internal')) return true;

  // IPv4 — basit regex; URL parser zaten validate etti
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 0) return true;                            // 0.0.0.0/8
    if (a === 10) return true;                           // 10.0.0.0/8
    if (a === 127) return true;                          // 127.0.0.0/8
    if (a === 169 && b === 254) return true;             // 169.254.0.0/16 (link-local + cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return true;    // 172.16.0.0/12
    if (a === 192 && b === 168) return true;             // 192.168.0.0/16
  }

  // IPv6 — kabaca kapsayıcı kontroller. URL parser bracket'leri kaldırır.
  if (h === '::' || h === '::1') return true;
  // fc00::/7 (ULA), fe80::/10 (link-local) — başlangıç hex'iyle filtrele
  if (/^f[cd]/.test(h)) return true;
  if (/^fe[89ab]/.test(h)) return true;
  // IPv4-mapped IPv6 (::ffff:127.0.0.1 vb.) — IPv4 kısmı zaten engellendi
  // ama hostname olarak gelirse kapsayalım
  if (h.startsWith('::ffff:')) {
    const v4 = h.slice('::ffff:'.length);
    return isPrivateOrLoopback(v4);
  }

  return false;
}

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

  // SSRF blocklist — internal/cloud-metadata adreslerine fetch yasak
  if (isPrivateOrLoopback(url.hostname)) {
    return {
      ok: false,
      error: 'Internal/private adreslere image URL kabul edilmiyor.',
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
