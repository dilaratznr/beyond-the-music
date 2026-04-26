/**
 * Image processing pipeline. Buffer → content-addressed hash → WebP/AVIF
 * variants (thumb/medium/large). Content-addressed names enable cache
 * immutability and deduplication; WebP primary format.
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

  // EXIF rotation up-front; clone per-output to avoid shared pipeline mutation.
  const pipeline = sharp(source, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();

  const sourceWidth = meta.width ?? 0;
  const sourceHeight = meta.height ?? 0;
  const isAnimated = (meta.pages ?? 1) > 1;

  // Animated GIFs: return original to preserve animation; sharp re-encode often larger.
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

  // Don't upscale (e.g., 300px → 1920px would blur + bloat).
  const usableBuckets = SIZE_BUCKETS.filter(
    (b) => sourceWidth === 0 || sourceWidth >= b.width,
  );

  // Emit at native width if smaller than smallest bucket.
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

  // Primary: prefer medium WebP, else thumb WebP, else first variant.
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

  // Fresh buffer per variant to avoid state leakage.
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
    // effort 4 balances CPU cost and compression (higher = marginal gains).
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
