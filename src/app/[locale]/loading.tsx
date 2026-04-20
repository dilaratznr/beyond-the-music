/**
 * Public-side route fallback shown while a server component is streaming.
 * Uses globally-scoped CSS classes (.btm-loader*) defined in globals.css —
 * keyframes need to be in the global stylesheet so they animate reliably
 * even on the very first paint of a route.
 */
export default function LocaleLoading() {
  return (
    <div
      className="bg-[#0a0a0b] min-h-screen flex items-center justify-center px-6"
      role="status"
      aria-live="polite"
    >
      <div className="btm-loader">
        <span className="btm-loader__wordmark">Beyond The Music</span>
        <div className="btm-loader__bar" aria-hidden="true" />
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
