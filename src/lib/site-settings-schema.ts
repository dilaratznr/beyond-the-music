/**
 * SiteSetting yazma validasyonu — PUT /api/settings'in tek otoriteyi.
 *
 * Neden: Schema'da `SiteSetting` modeli generic key/value tutar. PUT
 * endpoint'i şimdiye kadar gönderilen her stringi DB'ye yazıyordu.
 * Kompromize bir Super Admin hesabı (veya kazara yanlış yazılan key
 * adı) keyfi anahtarlar oluşturup XSS payload'ları (örneğin sosyal
 * link alanına `javascript:alert(1)`) saklayabilirdi — CSP `script-src`
 * dar olsa bile `<a href={url}>` üzerinden tıklayan kullanıcı yine de
 * yakalanırdı.
 *
 * Tasarım: anahtarlar kapalı bir küme, her anahtarın `kind`'ına göre
 * value validate edilir. Kümede olmayan anahtar 400 döner — sessizce
 * yazılmaz.
 */

import { validateImageUrl } from './url-validation';
import { PUBLIC_SECTIONS } from './site-sections';

type FieldKind =
  /** Düz metin. trim + uzunluk limiti. */
  | 'text'
  /** http(s):// URL veya relative `/`. SSRF blocklist'inden geçer. */
  | 'url'
  /** Basit RFC 5322 minimum kontrol. */
  | 'email'
  /** Yalnız rakam/boşluk/+()- karakteri. Locale-agnostic. */
  | 'phone'
  /** "true" veya "false" string literali. */
  | 'boolean-string'
  /** Parse edilebilir JSON. Custom nav için array of objects. */
  | 'json'
  /** Font kimliği — fonts.ts'teki tanımlı listede bulunmak zorunda. */
  | 'font-id';

interface FieldSpec {
  kind: FieldKind;
  maxLength?: number;
  /** Json kind'lar için ek validate hook'u. */
  validateJson?: (value: unknown) => string | null;
}

// ── Bilinen font kimlikleri — site-fonts.ts'teki FONT_OPTIONS ile eş ─
// Tek kaynak haline getirmek için site-fonts.ts'i refactor edip
// burada import edilebilir; şimdilik küçük bir dual-list, değişimde
// her iki yerden güncellenmesi yorum olarak işaretli.
const KNOWN_FONT_IDS = new Set([
  'inter', 'manrope', 'figtree', 'work-sans', 'plus-jakarta-sans', 'dm-sans',
  'outfit', 'space-grotesk', 'bricolage-grotesque', 'unbounded', 'syne',
  'playfair-display', 'fraunces', 'lora', 'eb-garamond', 'cormorant-garamond',
  'instrument-serif', 'source-serif-4', 'jetbrains-mono', 'ibm-plex-mono',
]);

// ── Allowlist ───────────────────────────────────────────────────────
//
// Yeni bir SiteSetting key ekleniyorsa BURAYA da eklenmek zorunda;
// aksi takdirde PUT 400 döner. Bilinçli yavaşlatma — yeni bir alan
// eklemek schema'da bilinçli bir değişiklik olmalı, yan etki değil.

const ALLOWED_FIELDS: Record<string, FieldSpec> = {
  // ── Contact ────────────────────────────────────────────────────────
  contact_email:           { kind: 'email', maxLength: 200 },
  contact_phone:           { kind: 'phone', maxLength: 32 },
  contact_phone_display:   { kind: 'text', maxLength: 64 },
  contact_address_name:    { kind: 'text', maxLength: 120 },
  contact_address_line:    { kind: 'text', maxLength: 300 },

  // ── Social — hepsi URL ─────────────────────────────────────────────
  social_instagram:        { kind: 'url', maxLength: 500 },
  social_youtube:          { kind: 'url', maxLength: 500 },
  social_spotify:          { kind: 'url', maxLength: 500 },
  social_twitter:          { kind: 'url', maxLength: 500 },
  social_tiktok:           { kind: 'url', maxLength: 500 },

  // ── Branding ───────────────────────────────────────────────────────
  site_name:               { kind: 'text', maxLength: 80 },
  site_logo_url:           { kind: 'url', maxLength: 500 },
  site_logo_footer_url:    { kind: 'url', maxLength: 500 },

  // ── Fonts ──────────────────────────────────────────────────────────
  site_font_body:          { kind: 'font-id' },
  site_font_display:       { kind: 'font-id' },

  // ── Hero (admin/hero-videos sayfasından) ──────────────────────────
  hero_poster_url:         { kind: 'url', maxLength: 500 },

  // ── Custom nav (JSON blob) ─────────────────────────────────────────
  nav_custom_items: {
    kind: 'json',
    maxLength: 8000,
    validateJson: (parsed) => {
      if (!Array.isArray(parsed)) return 'Custom nav JSON array olmalı.';
      if (parsed.length > 20) return 'En fazla 20 custom nav öğesi.';
      for (const item of parsed) {
        if (!item || typeof item !== 'object') return 'Geçersiz öğe formatı.';
        const o = item as Record<string, unknown>;
        if (typeof o.id !== 'string' || !o.id) return 'Öğe id eksik.';
        if (typeof o.href !== 'string') return 'Öğe href eksik.';
        // href validasyonu — javascript:, data: vs. yasak. Relative OK.
        const urlCheck = validateImageUrl(o.href);
        if (!urlCheck.ok) return `Öğe href: ${urlCheck.error}`;
        if (typeof o.labelTr !== 'string' && typeof o.labelEn !== 'string') {
          return 'Öğe için en az bir dil etiketi gerekli.';
        }
        if (o.enabled !== undefined && typeof o.enabled !== 'boolean') {
          return 'enabled boolean olmalı.';
        }
      }
      return null;
    },
  },

  // ── Section enable/disable — boolean string ───────────────────────
  // PUBLIC_SECTIONS'tan otomatik üretiliyor; yeni section eklendiğinde
  // schema'ya da otomatik gelir.
  ...Object.fromEntries(
    PUBLIC_SECTIONS.map(
      (s) => [s.settingKey, { kind: 'boolean-string' satisfies FieldKind }],
    ),
  ),
};

export type SiteSettingKey = keyof typeof ALLOWED_FIELDS;

export interface ValidationFailure {
  key: string;
  reason: string;
}

export interface ValidationResult {
  /** Yazılmaya uygun key/value çiftleri. */
  accepted: Array<{ key: string; value: string }>;
  /** Reddedilen değerler ve sebepleri. */
  rejected: ValidationFailure[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-\s]{0,32}$/;

function validateField(key: string, rawValue: unknown): ValidationFailure | null {
  const spec = ALLOWED_FIELDS[key];
  if (!spec) {
    return { key, reason: 'Bilinmeyen ayar anahtarı.' };
  }

  // value string olmalı — null/undefined "alanı temizle" anlamında "" gelmeli
  if (typeof rawValue !== 'string') {
    return { key, reason: 'Değer string olmalı.' };
  }

  const value = rawValue.trim();

  // Boş değer her zaman OK — UI tarafında "alanı kaldır" anlamı taşıyor.
  if (value === '') return null;

  if (spec.maxLength !== undefined && value.length > spec.maxLength) {
    return { key, reason: `Değer en fazla ${spec.maxLength} karakter.` };
  }

  switch (spec.kind) {
    case 'text':
      return null;

    case 'email':
      return EMAIL_RE.test(value) ? null : { key, reason: 'Geçerli bir e-posta gerekli.' };

    case 'phone':
      return PHONE_RE.test(value) ? null : { key, reason: 'Telefon yalnız 0-9 + ( ) - boşluk içerebilir.' };

    case 'url': {
      const check = validateImageUrl(value);
      return check.ok ? null : { key, reason: check.error ?? 'Geçersiz URL.' };
    }

    case 'boolean-string':
      return value === 'true' || value === 'false'
        ? null
        : { key, reason: "Değer 'true' veya 'false' olmalı." };

    case 'font-id':
      return KNOWN_FONT_IDS.has(value)
        ? null
        : { key, reason: 'Tanımsız font kimliği.' };

    case 'json': {
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch {
        return { key, reason: 'Geçerli JSON değil.' };
      }
      const customCheck = spec.validateJson?.(parsed);
      return customCheck ? { key, reason: customCheck } : null;
    }

    default:
      return { key, reason: 'Bilinmeyen alan tipi.' };
  }
}

/**
 * Bir PUT payload'ını allowlist + per-key validation'dan geçirir.
 * Kabul edilen değerler upsert için, reddedilenler hata yanıtı için.
 */
export function validateSettingsPayload(
  body: Record<string, unknown>,
): ValidationResult {
  const accepted: Array<{ key: string; value: string }> = [];
  const rejected: ValidationFailure[] = [];

  for (const [key, rawValue] of Object.entries(body)) {
    const failure = validateField(key, rawValue);
    if (failure) {
      rejected.push(failure);
      continue;
    }
    accepted.push({ key, value: String(rawValue).trim() });
  }

  return { accepted, rejected };
}
