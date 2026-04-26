/**
 * Site-wide `<img>` wrapper. Plain img (not next/image) for layout
 * control; WebP/AVIF bytes handled at upload time. Null-src guard +
 * graceful error fallback; two modes: fill (absolute inset-0) and sized.
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
