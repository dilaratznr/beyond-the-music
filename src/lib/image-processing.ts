/**
 * Image processing pipeline.
 *
 * Responsibilities:
 *   1. Take a raw image Buffer (JPEG/PNG/WebP/GIF).
 *    2. Produce a deterministic, content-addressed filename stem (`{hash}`).
 *   3. Generate a small, predictable set of derivatives:
 *        - sizes:   thumb (400w), medium (1024w), large (1920w)
 *        - formats: primary = WebP, optional = AVIF, fallback = original JPEG/PNG
 *   4. Return the list of outputs so callers (upload route / migration script)
 *      can persist them to S3 or the local disk.
 *
 * Why content-addressed names?
 *   - Immutable assets can be served with `Cache-Control: public, max-age=31536000, immutable`.
 *   - Re-uploading the same bytes is a no-op and lets us de-duplicate storage.
 *
 * Why WebP-first, AVIF-also, JPEG fallback?
 *   - next/image will automatically pick the best format the browser accepts
 *     when `formats: ['image/avif', 'image/webp']` is set in next.config.ts,
 *     but that only happens for *remote* images it fetches. For URLs we store
 *     directly in the DB we want the on-disk asset itself to already be WebP,
 *     so even pages that use `<img>` (temporarily, before Phase 2 finishes)
 *     get the smaller file. AVIF is produced alongside for `<picture>` sources.
 */

import sharp from "sharp";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * A single derivative we produced from one source image.
 * `key` is a stable, relative storage key (e.g. `uploads/{hash}-1024.webp`)
 * that the caller turns into a URL by prefixing its S3/CDN or local base.
 */
export type ImageVariant = {
  key: string;
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
  sizeLabel: SizeLabel;
  format: "webp" | "avif" | "jpeg" | "png" | "gif";
};

export type SizeLabel = "thumb" | "medium" | "large" | "original";

export type ProcessImageResult = {
  /** Stable hash of the original bytes. All variants share this stem. */
  hash: string;
  /** Natural width / height of the source image (after EXIF rotation). */
  sourceWidth: number;
  sourceHeight: number;
  /** All generated variants, in storage order (smallest first). */
  variants: ImageVariant[];
  /**
   * The variant callers should persist as the *primary* URL in the DB.
   * It is the WebP at `medium` size if the source is that big or larger,
   * otherwise the WebP at `thumb`, otherwise the re-encoded original.
   */
  primary: ImageVariant;
};

export type ProcessImageOptions = {
  /** Storage prefix (default: "uploads"). Variants become `{prefix}/{hash}-{size}.{ext}`. */
  prefix?: string;
  /** Skip AVIF generation (AVIF is ~4-6× slower than WebP). Default: true (generate). */
  generateAvif?: boolean;
  /** Keep animated GIFs as-is (sharp can re-encode them to WebP but we skip for safety). */
  keepAnimated?: boolean;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Width buckets the whole site is allowed to use. Keep this list short —
 * every bucket is a concrete file we pay to store and a cache key the CDN
 * has to warm up. `next/image` will further resize on the fly if needed.
 */
const SIZE_BUCKETS: Array<{ label: SizeLabel; width: number }> = [
  { label: "thumb", width: 400 },
  { label: "medium", width: 1024 },
  { label: "large", width: 1920 },
];

/** Quality knobs — picked to match Next's defaults and empirical sweet spots. */
const WEBP_QUALITY = 82;
const AVIF_QUALITY = 55; // AVIF at 55 ≈ WebP at 82 perceptually, much smaller file.

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

/**
 * Process a source image into a fixed set of WebP (+ optional AVIF) variants.
 *
 * Throws if the source cannot be decoded by sharp (corrupt or unsupported).
 */
export async function processImage(
  source: Buffer,
  opts: ProcessImageOptions = {},
): Promise<ProcessImageResult> {
  const prefix = (opts.prefix ?? "uploads").replace(/^\/+|\/+$/g, "");
  const generateAvif = opts.generateAvif ?? true;

  const hash = hashBuffer(source);

  // EXIF rotation is applied up-front so every derivative is oriented
  // correctly. We clone per-output to avoid mutating a shared pipeline.
  const pipeline = sharp(source, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();

  const sourceWidth = meta.width ?? 0;
  const sourceHeight = meta.height ?? 0;
  const isAnimated = (meta.pages ?? 1) > 1;

  // Animated GIFs: bail out of the resize pipeline and just return the
  // original. We'd lose the animation otherwise — sharp *can* handle it
  // but the output tends to be larger than the input for small GIFs.
  if (isAnimated && opts.keepAnimated !== false) {
    const variant: ImageVariant = {
      key: `${prefix}/${hash}.gif`,
      buffer: source,
      contentType: "image/gif",
      width: sourceWidth,
      height: sourceHeight,
      sizeLabel: "original",
      format: "gif",
    };
    return {
      hash,
      sourceWidth,
      sourceHeight,
      variants: [variant],
      primary: variant,
    };
  }

  const variants: ImageVariant[] = [];

  // Only emit a bucket if the source is at least that wide. Upscaling
  // a 300px logo to 1920px would blur it and bloat storage for nothing.
  const usableBuckets = SIZE_BUCKETS.filter(
    (b) => sourceWidth === 0 || sourceWidth >= b.width,
  );

  // If the image is smaller than our smallest bucket, we still emit one
  // variant at the source's native width so every uploaded image has at
  // least one entry to serve.
  const bucketsToProduce =
    usableBuckets.length > 0
      ? usableBuckets
      : [{ label: "thumb" as SizeLabel, width: sourceWidth || 400 }];

  for (const bucket of bucketsToProduce) {
    // WebP — primary format, always generated.
    variants.push(
      await encodeVariant({
        source,
        prefix,
        hash,
        sizeLabel: bucket.label,
        targetWidth: bucket.width,
        format: "webp",
      }),
    );

    if (generateAvif) {
      variants.push(
        await encodeVariant({
          source,
          prefix,
          hash,
          sizeLabel: bucket.label,
          targetWidth: bucket.width,
          format: "avif",
        }),
      );
    }
  }

  // Pick the primary: prefer `medium` WebP, else `thumb` WebP, else the
  // first variant we produced. This is what ends up in the DB.
  const primary =
    variants.find((v) => v.format === "webp" && v.sizeLabel === "medium") ??
    variants.find((v) => v.format === "webp" && v.sizeLabel === "thumb") ??
    variants[0];

  return {
    hash,
    sourceWidth,
    sourceHeight,
    variants,
    primary,
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

type EncodeArgs = {
  source: Buffer;
  prefix: string;
  hash: string;
  sizeLabel: SizeLabel;
  targetWidth: number;
  format: "webp" | "avif";
};

async function encodeVariant(args: EncodeArgs): Promise<ImageVariant> {
  const { source, prefix, hash, sizeLabel, targetWidth, format } = args;

  // Every variant starts from the original buffer, not a shared pipeline,
  // so sharp's internal state can't leak between encodes.
  let pipe = sharp(source, { failOn: "none" })
    .rotate()
    .resize({
      width: targetWidth,
      withoutEnlargement: true,
      fit: "inside",
    });

  if (format === "webp") {
    pipe = pipe.webp({ quality: WEBP_QUALITY, effort: 4 });
  } else {
    // effort 4 is a good sweet spot — higher values triple the CPU cost
    // for single-digit-percent size improvements.
    pipe = pipe.avif({ quality: AVIF_QUALITY, effort: 4 });
  }

  const { data, info } = await pipe.toBuffer({ resolveWithObject: true });

  return {
    key: `${prefix}/${hash}-${targetWidth}.${format}`,
    buffer: data,
    contentType: format === "webp" ? "image/webp" : "image/avif",
    width: info.width,
    height: info.height,
    sizeLabel,
    format,
  };
}

function hashBuffer(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Helpers for callers
// ---------------------------------------------------------------------------

/**
 * Build the `srcset` string for a group of variants at the same format.
 * Useful when Phase 2 migrates `<img>` to `<Image>` / `<picture>`.
 */
export function buildSrcSet(
  variants: ImageVariant[],
  format: ImageVariant["format"],
  baseUrl: string,
): string {
  return variants
    .filter((v) => v.format === format)
    .map((v) => `${baseUrl}/${v.key} ${v.width}w`)
    .join(", ");
}

/** True if the buffer is a GIF we should leave untouched. */
export async function isAnimatedGif(buf: Buffer): Promise<boolean> {
  const meta = await sharp(buf, { failOn: "none" }).metadata();
  return (meta.format === "gif") && (meta.pages ?? 1) > 1;
}
