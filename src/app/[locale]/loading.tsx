/**
 * Public-side route fallback shown while a server component is streaming.
 * Replaced the previous green spinner with a minimal, editorial-feel
 * wordmark + indeterminate progress line. Matches the rest of the
 * monochrome public design system (zinc + white, no accent colors).
 */
export default function LocaleLoading() {
  return (
    <div
      className="bg-[#0a0a0b] min-h-screen flex items-center justify-center px-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center">
        <span
          className="text-[10px] uppercase tracking-[0.5em] text-zinc-500 font-semibold"
          style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
        >
          Beyond The Music
        </span>
        <div className="mt-5 relative h-px w-40 overflow-hidden bg-white/5">
          <span
            className="absolute inset-y-0 left-0 w-1/3 bg-white/70"
            style={{ animation: 'btm-loading-bar 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}
          />
        </div>
        <span className="sr-only">Loading…</span>
      </div>
      <style>{`
        @keyframes btm-loading-bar {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
