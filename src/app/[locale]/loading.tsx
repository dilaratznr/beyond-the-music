export default function LocaleLoading() {
  return (
    <div
      className="bg-[#0a0a0b] min-h-screen flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"
          aria-hidden="true"
        />
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
