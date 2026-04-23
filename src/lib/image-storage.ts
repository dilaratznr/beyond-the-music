/**
 * Storage adapter for image variants.
 *
 * One pipeline produces many `ImageVariant`s; we need to persist each one
 * to either S3 (preferred on serverless hosts like Vercel where the FS is
 * ephemeral) or the local `public/uploads` directory. The upload route and
 * the one-off migration script both need this logic, so it lives in its
 * own module.
 *
 * Detection rule: if `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and
 * `AWS_S3_BUCKET_NAME` are all set we use S3. Otherwise we fall back to
 * local disk. Any S3 failure is caught by the caller and they decide
 * whether to fall back — this module never silently switches backends,
 * because callers need to know which URL format they'll get back.
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
 * Persist every variant to the configured backend.
 *
 * On S3 errors we fall back to local disk *once* and log — the rest of the
 * batch stays on local disk so the DB row stays consistent (we never want
 * half the variants on S3 and half on disk for the same image).
 */
export async function storeVariants(
  variants: ImageVariant[],
): Promise<{ stored: StoredVariant[]; backend: StorageBackend }> {
  if (hasS3Config()) {
    try {
      const stored = await Promise.all(variants.map(storeToS3));
      return { stored, backend: "s3" };
    } catch (err) {
      console.error(
        "[image-storage] S3 batch failed, falling back to local:",
        err,
      );
      // Fall through to local path below.
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
