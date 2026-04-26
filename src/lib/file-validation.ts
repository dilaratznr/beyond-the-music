/**
 * Server-side image upload validation — magic-byte signature kontrolü +
 * sharp ile metadata doğrulama.
 *
 * Neden ilave kontrol gerekli: `file.type` browser'da uzantıdan üretilir,
 * saldırgan curl ile istediği MIME'i header'a yazabilir. `.png` olarak
 * post edilen PHP/HTML dosyası header check'inden geçer ama gerçek
 * binary içeriği farklıdır. Magic-byte kontrolü ilk 4-12 byte'a bakarak
 * dosyanın gerçek tipini doğrular.
 *
 * Sharp ek olarak:
 *   - Bozuk veya kasten malformed image'i reddeder
 *   - "Pixel-flood" / "image-bomb" saldırısını keser (1KB PNG → 50000x50000
 *     decode etmeye kalkıyor → OOM). 8000x8000 üst sınırı koyuyoruz.
 *   - Animasyonlu GIF veya çok-frame'li dosyalarda anomali tespit edebilir
 *
 * SVG ASLA kabul edilmiyor: SVG XML olduğu için <script> taşıyabilir,
 * sanitize edilmeden render edilirse stored XSS. ALLOWED_MIMES'a ekleme.
 */

const SIGNATURES: Array<{
  mime: string;
  prefix: number[];
  // Bazı format'lar offset'te ek byte arar (WebP'de RIFF...WEBP)
  suffix?: { offset: number; bytes: number[] };
}> = [
  // JPEG: FF D8 FF (sonraki byte JPEG variant'ına göre değişir)
  { mime: 'image/jpeg', prefix: [0xff, 0xd8, 0xff] },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  {
    mime: 'image/png',
    prefix: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  // GIF87a / GIF89a
  { mime: 'image/gif', prefix: [0x47, 0x49, 0x46, 0x38] },
  // WebP: RIFF....WEBP
  {
    mime: 'image/webp',
    prefix: [0x52, 0x49, 0x46, 0x46], // "RIFF"
    suffix: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // "WEBP"
  },
];

function bufferStartsWith(
  buf: Buffer,
  prefix: number[],
  offset = 0,
): boolean {
  if (buf.length < offset + prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (buf[offset + i] !== prefix[i]) return false;
  }
  return true;
}

/**
 * Buffer'ın gerçek MIME type'ını magic byte'a göre döndür.
 * Tanınmıyor / desteklenmeyen format ise null.
 */
export function detectImageMime(buf: Buffer): string | null {
  for (const sig of SIGNATURES) {
    if (!bufferStartsWith(buf, sig.prefix)) continue;
    if (sig.suffix && !bufferStartsWith(buf, sig.suffix.bytes, sig.suffix.offset)) {
      continue;
    }
    return sig.mime;
  }
  return null;
}

export interface ValidatedImage {
  ok: boolean;
  mime?: string;
  width?: number;
  height?: number;
  error?: string;
}

const MAX_DIMENSION = 8000;

/**
 * Tam validation pipeline:
 *   1) Magic byte kontrolü → claim edilen MIME ile eşleşiyor mu?
 *   2) sharp ile metadata aç → bozuk / pixel-flood / vector format
 *      değilse ve boyutlar limit altındaysa OK.
 *
 * sharp dynamic import — bundle boyutu için sadece bu route'ta yükleniyor.
 */
export async function validateImageBuffer(
  buf: Buffer,
  claimedMime: string,
): Promise<ValidatedImage> {
  // 1) Magic byte
  const realMime = detectImageMime(buf);
  if (!realMime) {
    return { ok: false, error: 'Dosya tanınmadı veya desteklenmeyen format.' };
  }
  if (realMime !== claimedMime) {
    return {
      ok: false,
      error: `MIME uyumsuzluğu: header "${claimedMime}" ama içerik "${realMime}".`,
    };
  }

  // 2) sharp ile dimension + integrity kontrolü.
  try {
    const sharp = (await import('sharp')).default;
    const meta = await sharp(buf, { failOn: 'error' }).metadata();
    if (!meta.width || !meta.height) {
      return { ok: false, error: 'Görsel boyutları okunamadı.' };
    }
    if (meta.width > MAX_DIMENSION || meta.height > MAX_DIMENSION) {
      return {
        ok: false,
        error: `Görsel boyutu çok büyük (max ${MAX_DIMENSION}x${MAX_DIMENSION}px).`,
      };
    }
    return {
      ok: true,
      mime: realMime,
      width: meta.width,
      height: meta.height,
    };
  } catch {
    return { ok: false, error: 'Bozuk veya geçersiz görsel.' };
  }
}
