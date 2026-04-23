/**
 * One-off migration: walk every image URL stored in the DB, re-encode each
 * source through the Phase-1 pipeline (WebP + AVIF at thumb/medium/large),
 * persist the variants to the configured storage backend, and swap the DB
 * row to point at the new primary URL.
 *
 * Design goals (in order of priority):
 *   1. **Idempotent.** Running it twice is a no-op — a row is skipped if its
 *      current URL already looks like a pipeline-generated WebP/AVIF asset.
 *   2. **Non-destructive.** The original file is NEVER deleted. If something
 *      looks wrong after running, rolling back is just pointing the DB row
 *      back at the old URL (git history + DB backup will both show it).
 *   3. **Restartable.** Each row is committed independently, so a crash
 *      halfway through leaves the work we did intact.
 *
 * Usage:
 *   npm run media:migrate             # dry run — prints what would change
 *   npm run media:migrate -- --apply  # actually write to DB + storage
 *   npm run media:migrate -- --apply --limit 50
 *
 * NOT run automatically by `npm run build` — this is a deliberate one-shot
 * because bulk re-encoding is slow and we want a human to watch it.
 */

import "dotenv/config";
import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { processImage } from "../src/lib/image-processing";
import { storeVariants } from "../src/lib/image-storage";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const VERBOSE = args.includes("--verbose");
const LIMIT_FLAG = args.indexOf("--limit");
const LIMIT =
  LIMIT_FLAG >= 0 ? Number(args[LIMIT_FLAG + 1]) || Infinity : Infinity;

// ---------------------------------------------------------------------------
// Which models / which fields to migrate
// ---------------------------------------------------------------------------

/**
 * Declarative map of every image URL column in the schema. Adding a new
 * entity with an image field means adding one line here — no changes to
 * the walker below.
 */
type Target = {
  model: keyof PrismaClient;
  field: string;
  // Prisma's generated type doesn't let us parametrise on string model
  // names cleanly without a big generics dance, so we lean on `any` here.
  // The field access is guarded at runtime by the presence check below.
};

const TARGETS: Target[] = [
  { model: "user", field: "avatar" },
  { model: "genre", field: "image" },
  { model: "artist", field: "image" },
  { model: "album", field: "coverImage" },
  { model: "architect", field: "image" },
  { model: "article", field: "featuredImage" },
  { model: "listeningPath", field: "image" },
  { model: "mediaItem", field: "url" },
];

// ---------------------------------------------------------------------------
// Decision: does this URL still need to be migrated?
// ---------------------------------------------------------------------------

/**
 * We skip a row when its URL already points at a pipeline-generated file:
 *   `.../uploads/{16-hex}-{width}.(webp|avif)` or `.../uploads/{16-hex}.gif`.
 *
 * Anything else (legacy `1712345678-abc123.jpg`, external Unsplash URLs,
 * YouTube thumbnails, unknown hosts) goes through the migration.
 *
 * External URLs on hosts we don't control are fetched once and mirrored
 * into our own storage so the site stops depending on third-party
 * availability. That is intentional — the alternative is that a broken
 * external link permanently degrades the site.
 */
const PIPELINE_FILENAME = /\/uploads\/[a-f0-9]{16}(-\d+)?\.(webp|avif|gif)$/i;

function alreadyMigrated(url: string): boolean {
  return PIPELINE_FILENAME.test(url);
}

// ---------------------------------------------------------------------------
// Reading the source bytes (local disk OR HTTP fetch)
// ---------------------------------------------------------------------------

/** Fetch the raw bytes of the image at `url`, wherever it lives. */
async function fetchSource(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith("/")) {
      // Served from /public. Read it from disk to avoid booting Next.
      const abs = path.join(process.cwd(), "public", url.replace(/^\/+/, ""));
      return await readFile(abs);
    }
    // Absolute URL (S3/R2/CDN, or legacy external like Unsplash).
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ↳ fetch failed (${res.status}): ${url}`);
      return null;
    }
    const arr = new Uint8Array(await res.arrayBuffer());
    return Buffer.from(arr);
  } catch (err) {
    console.warn(`  ↳ fetch threw: ${url} — ${(err as Error).message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main walk
// ---------------------------------------------------------------------------

type Stat = {
  scanned: number;
  skipped: number;
  migrated: number;
  failed: number;
};

async function migrateTarget(target: Target, stat: Stat): Promise<void> {
  // Cast once, up here, to keep the rest readable. We access `.findMany`
  // and `.update` dynamically — Prisma's runtime handles the rest.
  const delegate = (prisma as unknown as Record<string, {
    findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
    update: (args: unknown) => Promise<unknown>;
  }>)[target.model as string];

  // We don't filter `{ not: null }` in the query because some targets
  // (e.g. MediaItem.url) are non-nullable and Prisma rejects the operator
  // on required String fields. The null check below catches both cases.
  const rows = await delegate.findMany({
    select: { id: true, [target.field]: true },
  });

  console.log(
    `\n▸ ${String(target.model)}.${target.field}: ${rows.length} row(s) with a URL`,
  );

  for (const row of rows) {
    if (stat.migrated >= LIMIT) return;

    const id = row.id as string;
    const url = row[target.field] as string | null;
    stat.scanned++;

    if (!url) {
      stat.skipped++;
      continue;
    }

    if (alreadyMigrated(url)) {
      if (VERBOSE) console.log(`  · skip (already migrated): ${url}`);
      stat.skipped++;
      continue;
    }

    const src = await fetchSource(url);
    if (!src) {
      stat.failed++;
      continue;
    }

    try {
      const processed = await processImage(src, { prefix: "uploads" });
      if (!APPLY) {
        console.log(
          `  · dry-run: ${String(target.model)}#${id} → ${processed.primary.key} (${processed.variants.length} variants)`,
        );
        stat.migrated++;
        continue;
      }

      const { stored } = await storeVariants(processed.variants);
      const newPrimary = stored.find((v) => v.key === processed.primary.key);
      if (!newPrimary) {
        console.warn(`  ↳ ${String(target.model)}#${id}: primary not stored`);
        stat.failed++;
        continue;
      }

      await delegate.update({
        where: { id },
        data: { [target.field]: newPrimary.url },
      });

      console.log(
        `  ✓ ${String(target.model)}#${id}: ${url} → ${newPrimary.url}`,
      );
      stat.migrated++;
    } catch (err) {
      console.error(
        `  ✗ ${String(target.model)}#${id} failed:`,
        (err as Error).message,
      );
      stat.failed++;
    }
  }
}

async function main(): Promise<void> {
  console.log(
    `Image migration — ${APPLY ? "APPLY MODE (writes)" : "dry run (no writes)"}${
      LIMIT !== Infinity ? `, limit=${LIMIT}` : ""
    }`,
  );

  const stat: Stat = { scanned: 0, skipped: 0, migrated: 0, failed: 0 };

  for (const target of TARGETS) {
    if (stat.migrated >= LIMIT) break;
    await migrateTarget(target, stat);
  }

  console.log("\n────────────────────────────");
  console.log(`Scanned:  ${stat.scanned}`);
  console.log(`Skipped:  ${stat.skipped}  (already migrated or null)`);
  console.log(`Migrated: ${stat.migrated}${APPLY ? "" : "  (dry run — would migrate)"}`);
  console.log(`Failed:   ${stat.failed}`);

  if (!APPLY && stat.migrated > 0) {
    console.log("\nRe-run with `-- --apply` to actually write changes.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
