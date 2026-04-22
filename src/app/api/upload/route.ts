import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireSectionAccess } from "@/lib/auth-guard";
import prisma from "@/lib/prisma";
import { CACHE_TAGS } from "@/lib/db-cache";
import { processImage } from "@/lib/image-processing";
import { storeVariants } from "@/lib/image-storage";

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

/**
 * Whitelist of MIME types we will accept from the admin UI. We keep GIF on
 * the list because animated GIFs are passed through as-is by the pipeline
 * (see `processImage`); everything else gets re-encoded to WebP + AVIF.
 */
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_SIZE = 10 * 1024 * 1024; // 10MB — we downscale aggressively, so allow bigger sources.

/**
 * Which "bucket" an uploaded image belongs to. Passed through to `MediaItem`
 * so the admin Media Library can filter by entity. "other" is the catch-all
 * for ad-hoc uploads that aren't pinned to a specific entity.
 */
const ALLOWED_CATEGORIES = new Set([
  "artist",
  "album",
  "genre",
  "article",
  "architect",
  "listening-path",
  "hero",
  "other",
]);

// ---------------------------------------------------------------------------
// POST /api/upload
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Only authenticated admins with MEDIA access can upload.
  const { error } = await requireSectionAccess("MEDIA", "canCreate");
  if (error) return error;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: JPG, PNG, WebP, GIF" },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum 10MB" },
      { status: 400 },
    );
  }

  const rawCategory =
    (formData.get("category") as string | null)?.trim() || "other";
  const category = ALLOWED_CATEGORIES.has(rawCategory) ? rawCategory : "other";

  // entityId is optional — unattached library uploads pass `""`/null.
  const entityIdRaw =
    (formData.get("entityId") as string | null)?.trim() || "";
  const entityId = entityIdRaw || "unattached";

  const sourceBuffer = Buffer.from(await file.arrayBuffer());

  // ----- Pipeline -----
  // processImage is the single entry-point that decides how many variants
  // (sizes × formats) we produce. It also short-circuits animated GIFs so
  // we don't lose the animation.
  let processed;
  try {
    processed = await processImage(sourceBuffer, { prefix: "uploads" });
  } catch (err) {
    console.error("[upload] processImage failed:", err);
    return NextResponse.json(
      { error: "Could not decode image. Is the file corrupted?" },
      { status: 400 },
    );
  }

  // Persist every variant together — storage backend picks S3 or local disk
  // based on env config. Storing fails as a batch so we never end up with
  // half-a-set of variants on one backend and half on the other.
  let stored;
  try {
    stored = await storeVariants(processed.variants);
  } catch (err) {
    console.error("[upload] storeVariants failed:", err);
    return NextResponse.json(
      { error: "Failed to save image to storage" },
      { status: 500 },
    );
  }

  // The URL we persist in the DB is the *primary* variant (medium WebP by
  // default). Pages that haven't migrated to <Image> yet still benefit
  // because the on-disk file is already compressed.
  const primary = stored.stored.find(
    (v) =>
      v.key === processed.primary.key && v.storage === stored.backend,
  );
  if (!primary) {
    return NextResponse.json(
      { error: "Internal error: primary variant not found after storage" },
      { status: 500 },
    );
  }

  const item = await prisma.mediaItem.create({
    data: {
      url: primary.url,
      type: "IMAGE",
      entityType: category,
      entityId,
    },
  });

  revalidateTag(CACHE_TAGS.mediaItem, 'max');

  // We return all variant URLs so the admin UI can preview alternatives
  // (e.g. the thumb is handy for avatar-style pickers) and so a future
  // <Image srcSet=...> upgrade doesn't need another DB round-trip.
  return NextResponse.json({
    id: item.id,
    url: primary.url,
    category,
    storage: stored.backend,
    width: primary.width,
    height: primary.height,
    variants: stored.stored.map((v) => ({
      url: v.url,
      width: v.width,
      height: v.height,
      sizeLabel: v.sizeLabel,
      format: v.format,
    })),
  });
}

// ---------------------------------------------------------------------------
// GET /api/upload — media library listing
// ---------------------------------------------------------------------------

export async function GET() {
  const { error } = await requireSectionAccess("MEDIA", "canCreate");
  if (error) return error;

  const items = await prisma.mediaItem.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(items);
}
