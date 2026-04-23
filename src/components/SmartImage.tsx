/**
 * SmartImage — our single site-wide wrapper around a plain `<img>` tag.
 *
 * Why NOT `next/image`?
 *   We originally tried it, but `fill` mode subtly broke several of our
 *   card / hero layouts (images stopped covering the full container even
 *   with `relative` parents). Since the perf win we actually care about
 *   comes from the WebP/AVIF *bytes* (handled at upload time by
 *   `src/lib/image-processing.ts` and the `media:migrate` script), not
 *   from the next/image runtime, a plain `<img>` gives us identical
 *   pre-migration layout with zero regressions.
 *
 * What SmartImage still gives us over a raw `<img>`:
 *   - Null/empty-src guard → renders `fallback` (default: nothing) without
 *     a broken-image frame. 90% of our DB image fields are nullable, so
 *     this collapses `{src && <img ...>}` to a one-liner.
 *   - Graceful onError → same fallback path on 404/CORS failures.
 *   - Two ergonomic modes that match the two shapes `<img>` takes across
 *     this codebase:
 *        fill-pattern : `absolute inset-0 w-full h-full object-cover`
 *        sized-pattern: `w-full h-40 object-cover` (or width/height attrs)
 *   - `loading="lazy"` + `decoding="async"` by default; `priority` flips
 *     them to `eager` + sync for the single LCP image per page.
 *
 * Usage:
 *   // Fill mode — parent must be `position: relative` and sized.
 *   <SmartImage src={album.coverImage} alt={album.title} fill
 *               className="object-cover" />
 *
 *   // Sized mode — fixed intrinsic dimensions.
 *   <SmartImage src={r.image} alt="" width={40} height={40}
 *               className="rounded-lg object-cover" />
 */

"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CommonProps = {
  /**
   * Source URL. Accepts `null`/`undefined`/`""` — the component renders
   * `fallback` (default nothing) so callers no longer need `{src && ...}`.
   */
  src: string | null | undefined;
  alt: string;
  className?: string;
  /**
   * If true, loads eagerly + decodes synchronously + hints preload. Use
   * this ONLY for the single LCP image on a page (typically the hero).
   * Marking everything priority defeats the purpose.
   */
  priority?: boolean;
  /**
   * Accepted for API compatibility but a no-op in the plain-<img> world.
   * Kept so call-sites that already pass `sizes` don't need to change.
   */
  sizes?: string;
  /**
   * Accepted for API compatibility; no runtime effect on plain `<img>`.
   */
  quality?: number;
  /**
   * Rendered in place of the image when src is falsy or the request
   * fails (404/CORS). Defaults to `null`.
   */
  fallback?: React.ReactNode;
};

type FillProps = CommonProps & {
  fill: true;
  width?: never;
  height?: never;
};

type SizedProps = CommonProps & {
  fill?: false | undefined;
  width: number;
  height: number;
};

export type SmartImageProps = FillProps | SizedProps;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SmartImage(props: SmartImageProps) {
  const { src, alt, className, priority = false, fallback = null } = props;

  // Track failures so we don't re-render a broken frame. Keyed by URL so
  // the error resets when the src prop changes.
  const [errored, setErrored] = useState<string | null>(null);

  if (!src) return <>{fallback}</>;
  if (errored === src) return <>{fallback}</>;

  const loading = priority ? "eager" : "lazy";
  const decoding = priority ? "sync" : "async";
  const fetchPriority = priority ? "high" : undefined;

  if (props.fill) {
    // Match the pre-migration pattern exactly:
    //   <img className="absolute inset-0 w-full h-full {user classes}" />
    // Prepending rather than appending so callers can still override with
    // more specific utilities (e.g. `object-contain`).
    const cls = ["absolute", "inset-0", "w-full", "h-full", className]
      .filter(Boolean)
      .join(" ");
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cls}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        onError={() => setErrored(src)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={props.width}
      height={props.height}
      className={className}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      onError={() => setErrored(src)}
    />
  );
}
