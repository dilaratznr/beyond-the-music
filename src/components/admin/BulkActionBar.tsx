'use client';

import { useState, type ReactNode } from 'react';

/**
 * Sticky toolbar that appears at the top of a list page when at least one
 * row is selected. Renders a "N seçildi" label, a configurable set of
 * primary actions, and a "Sil" button that triggers a POST to the given
 * bulk-delete endpoint. The caller supplies the endpoint and the selected
 * IDs; we handle confirmation, pending state, and errors in one place.
 *
 * Visual: zinc-900 bar with a subtle amber accent so it reads as a
 * transient toolbar rather than part of the normal chrome.
 */
export default function BulkActionBar({
  count,
  itemLabel,
  endpoint,
  ids,
  onCleared,
  extra,
}: {
  count: number;
  itemLabel: string; // e.g. "albüm", "şarkı"
  endpoint: string; // POST target for bulk delete
  ids: readonly string[];
  onCleared: () => void;
  extra?: ReactNode; // extra action buttons (e.g. bulk status change)
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onBulkDelete() {
    if (busy || count === 0) return;
    const confirmed = window.confirm(
      `${count} ${itemLabel} silinecek. Bu işlem geri alınamaz. Devam edilsin mi?`,
    );
    if (!confirmed) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Silinemedi');
      }
      onCleared();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Silinemedi');
    } finally {
      setBusy(false);
    }
  }

  if (count === 0) return null;

  return (
    <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-3 px-3 py-2 rounded-md border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm">
      <span className="text-[12px] text-amber-100 font-medium">
        <span className="font-mono font-bold">{count}</span> {itemLabel} seçildi
      </span>
      <div className="flex-1 flex items-center justify-end flex-wrap gap-1.5">
        {extra}
        <button
          type="button"
          onClick={onBulkDelete}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-500/15 text-rose-200 border border-rose-500/30 hover:bg-rose-500/25 disabled:opacity-50 disabled:cursor-wait transition-colors"
        >
          {busy ? 'Siliniyor…' : `Sil (${count})`}
        </button>
        <button
          type="button"
          onClick={onCleared}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-zinc-900/60 text-zinc-300 border border-zinc-700 hover:bg-zinc-800 transition-colors"
        >
          İptal
        </button>
      </div>
      {err && (
        <div className="w-full text-[11px] text-rose-300">
          Hata: {err}
        </div>
      )}
    </div>
  );
}

/**
 * Small tri-state checkbox used both in list headers ("select all on
 * page") and per-row. When `indeterminate` is true we show a dash
 * instead of a checkmark.
 */
export function BulkCheckbox({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  // Native checkboxes can't represent tri-state visually in Tailwind-only
  // CSS, so we render a custom button with aria-checked="mixed".
  const state = indeterminate ? 'mixed' : checked ? 'true' : 'false';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
        checked || indeterminate
          ? 'bg-white border-white text-zinc-950'
          : 'bg-zinc-900 border-zinc-600 hover:border-zinc-400'
      }`}
    >
      {indeterminate ? (
        <span className="block w-2 h-[2px] bg-zinc-950" aria-hidden="true" />
      ) : checked ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : null}
    </button>
  );
}
