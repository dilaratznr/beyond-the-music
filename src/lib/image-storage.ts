/**
 * Storage adapter for image variants (S3 or local disk). Persists variants
 * to one backend per batch (fail-once, then fallback to local).
 */

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import type { ImageVariant } from "./image-processing";

export type StorageBackend = "s3" | "local";

export type StoredVariant = ImageVariant & {
  url: string;
  storage: StorageBackend;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** True if the runtime env is fully configured for S3 / R2. */
export function hasS3Config(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET_NAME,
  );
}

/**
 * Persist all variants to one backend. On S3 failure, fallback to local
 * (entire batch for consistency; never split).
 */
export async function storeVariants(
  variants: ImageVariant[],
): Promise<{ stored: StoredVariant[]; backend: StorageBackend }> {
  if (hasS3Config()) {
    try {
      const stored = await Promise.all(variants.map(storeToS3));
      return { stored, backend: "s3" };
    } catch (err) {
      console.error("[image-storage] S3 batch failed, falling back to local:", err);
      // Fall through to local.
    }
  }

  const stored = await Promise.all(variants.map(storeToLocal));
  return { stored, backend: "local" };
}

// ---------------------------------------------------------------------------
// Backends
// ---------------------------------------------------------------------------

async function storeToS3(variant: ImageVariant): Promise<StoredVariant> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const s3 = new S3Client({
    region: process.env.AWS_REGION || "auto",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    endpoint: process.env.AWS_S3_ENDPOINT_URL || undefined,
  });

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: variant.key,
      Body: variant.buffer,
      ContentType: variant.contentType,
      ACL: "public-read",
      // Content-hashed filenames are immutable, so the CDN can cache forever.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const publicDomain =
    process.env.AWS_S3_PUBLIC_DOMAIN ||
    `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com`;

  return {
    ...variant,
    url: `${publicDomain.replace(/\/+$/, "")}/${variant.key}`,
    storage: "s3",
  };
}

async function storeToLocal(variant: ImageVariant): Promise<StoredVariant> {
  // `key` is like "uploads/abcd-1024.webp"; translate to an absolute path
  // under `public/` so Next can serve it at `/uploads/abcd-1024.webp`.
  const targetAbsolute = path.join(process.cwd(), "public", variant.key);
  await mkdir(path.dirname(targetAbsolute), { recursive: true });
  await writeFile(targetAbsolute, variant.buffer);

  return {
    ...variant,
    url: `/${variant.key}`,
    storage: "local",
  };
}
