/**
 * Server-side image validation: magic-byte signature check + sharp metadata
 * (size, format). Detects spoofed MIME, pixel-bombs, corrupted files.
 * SVG never allowed (XML, stored XSS risk).
 */

const SIGNATURES: Array<{
  mime: string;
  prefix: number[];
  // Some formats check suffix bytes at offset (e.g., WebP: RIFF...WEBP).
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

/** Detect real MIME from magic bytes; null if unrecognized. */
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
 * Full validation: magic-byte check, sharp metadata (corrupt/pixel-bomb/format),
 * dimension limits. sharp dynamically imported for bundle size.
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
