/**
 * Storage adapter for image variants (S3/R2 veya local disk).
 *
 * `processImage` (image-processing.ts) bir orijinali alıp birden çok
 * `ImageVariant` (thumb / medium / large / original) üretiyor. Bu modül
 * o variant'ları sırayla persiste eder ve her biri için public URL döner.
 *
 * Backend seçimi:
 *   - AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_S3_BUCKET_NAME varsa
 *     S3/R2'ye yazar.
 *   - Aksi takdirde /public/uploads dizinine düşer (serverless'te kalıcı
 *     değil — sadece dev veya tek-makine deployment).
 *
 * Yalnızca `scripts/convert-images-to-webp.ts` (one-off migration) tüketiyor.
 * Normal upload akışı `src/app/api/upload/route.ts` içinde inline yazıyor;
 * iki kod tabanını birleştirmek refactor isteyince ayrı bırakıldı.
 */

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type { ImageVariant } from './image-processing';

export type StorageBackend = 's3' | 'local';

export type StoredVariant = ImageVariant & {
  /** Public URL — browser'a verilecek hali. */
  url: string;
};

export function hasS3Config(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET_NAME,
  );
}

/**
 * Bir batch variant'ı tek bir backend üzerinden persist eder. S3 başarısız
 * olursa local fallback'e DÜŞMEZ (silent migration corruption riski) —
 * önce S3 dene, hata fırlatırsa caller görür.
 *
 * Caller: scripts/convert-images-to-webp.ts (image migration). Migration
 * sırasında S3'e yazılan dosyaların referansları DB'ye geri yazılıyor;
 * yarı yazılmış bir batch tutarsız link bırakır. O yüzden best-effort
 * mantığı yok — ya hep ya hiç.
 */
export async function storeVariants(
  variants: ImageVariant[],
): Promise<{ stored: StoredVariant[]; backend: StorageBackend }> {
  if (hasS3Config()) {
    const stored = await storeAllS3(variants);
    return { stored, backend: 's3' };
  }
  const stored = await storeAllLocal(variants);
  return { stored, backend: 'local' };
}

// ── S3 / R2 backend ─────────────────────────────────────────────────────

async function storeAllS3(variants: ImageVariant[]): Promise<StoredVariant[]> {
  // Dynamic import — local-only kullanım durumlarında S3 SDK'yi parse etme
  // maliyetinden kaçınmak için.
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: process.env.AWS_REGION || 'auto',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    endpoint: process.env.AWS_S3_ENDPOINT_URL || undefined,
  });

  const bucket = process.env.AWS_S3_BUCKET_NAME!;
  // AWS_S3_PUBLIC_DOMAIN: R2 / custom domain için zorunlu. Native AWS S3'te
  // virtual-hosted style URL'ine düş.
  const publicDomain =
    process.env.AWS_S3_PUBLIC_DOMAIN ||
    `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;
  const baseUrl = publicDomain.replace(/\/+$/, '');

  const results: StoredVariant[] = [];
  for (const variant of variants) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: variant.key,
        Body: variant.buffer,
        ContentType: variant.contentType,
        ACL: 'public-read',
      }),
    );
    results.push({ ...variant, url: `${baseUrl}/${variant.key}` });
  }
  return results;
}

// ── Local disk backend ──────────────────────────────────────────────────

async function storeAllLocal(variants: ImageVariant[]): Promise<StoredVariant[]> {
  const uploadDir = path.join(process.cwd(), 'public');
  const results: StoredVariant[] = [];
  for (const variant of variants) {
    // variant.key formatı: "uploads/<hash>-thumb.webp" gibi — relative path
    // public/ altında dosya sistemine birebir yansır.
    const fullPath = path.join(uploadDir, variant.key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, variant.buffer);
    results.push({ ...variant, url: `/${variant.key}` });
  }
  return results;
}
