'use client';

/**
 * Reusable loading primitives for admin pages (dark theme).
 *
 * - Skeleton         — shimmering placeholder block
 * - Spinner          — small rotating ring
 * - InlineLoading    — spinner + label, used when full skeletons are overkill
 * - TableSkeleton    — list pages (rows + header strip)
 * - FormSkeleton     — entity edit/new pages (2-col layout with sticky media)
 * - SettingsSkeleton — settings page (single column with stacked cards)
 */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-md ${className}`} />;
}

export function Spinner({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3 h-3';
  return (
    <span
      className={`${sizeClass} inline-block rounded-full border-2 border-zinc-700 border-t-zinc-100 animate-spin`}
      aria-label="Yükleniyor"
      role="status"
    />
  );
}

export function InlineLoading({ label = 'Yükleniyor…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-zinc-400 text-xs">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function TableSkeleton({ rows = 5, showHeader = true }: { rows?: number; showHeader?: boolean }) {
  return (
    <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
      {showHeader && <div className="bg-zinc-900/80 border-b border-zinc-800 h-10" />}
      <div className="divide-y divide-zinc-800/60">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-5 py-3"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Skeleton className="w-12 h-12 rounded-md flex-shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-2 w-1/4" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
            <Skeleton className="h-5 w-24 rounded flex-shrink-0 hidden md:block" />
            <Skeleton className="h-7 w-28 rounded-md flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="grid lg:grid-cols-[1fr_260px] gap-5">
      <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-5 space-y-6">
        <Skeleton className="h-3.5 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="grid grid-cols-[1fr_200px] gap-4">
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <Skeleton className="h-3.5 w-28 mt-2" />
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
      <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-5 h-fit space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="aspect-[3/4] w-full max-w-[220px]" />
        <Skeleton className="h-2.5 w-full max-w-[200px]" />
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 px-4 py-2.5 flex items-center gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-40 rounded-md" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="px-5 py-3.5 bg-zinc-900/80 border-b border-zinc-800 space-y-2">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-2.5 w-64" />
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-32" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-28" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
