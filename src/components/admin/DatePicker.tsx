'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Lightweight, dependency-free date picker that replaces the native
 * `<input type="date">` browser calendar (which renders unstyled
 * Western-locale popups that clash with the admin look). Outputs the
 * same ISO `YYYY-MM-DD` string so existing form state & API payloads
 * stay unchanged — drop-in swap.
 *
 * Behavior:
 *   - Trigger button shows the formatted Turkish date (or placeholder)
 *   - Click opens a styled month grid; outside-click / Esc closes it
 *   - Month / year nav arrows; "Bugün" jumps to today; "Temizle" clears
 *   - Keyboard: Esc closes; days are buttons (Tab/Enter native)
 */

const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const TR_WEEKDAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoDate(d: Date): string {
  // Local-time formatting (not UTC). DB sees the wall-clock date the
  // editor picked, regardless of their timezone — `toISOString()` would
  // shift midnight back a day for users west of UTC.
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseIsoDate(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatTrDisplay(s: string): string {
  const d = parseIsoDate(s);
  if (!d) return '';
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Build a 6×7 grid of dates for the given month — Pzt-anchored.
 * Includes leading days from previous month + trailing days of next so
 * the grid is always a clean rectangle (no shifting / jumping rows).
 */
function buildMonthGrid(viewMonth: Date): Date[] {
  const first = startOfMonth(viewMonth);
  // JS getDay(): 0=Sun..6=Sat. We want 0=Mon..6=Sun.
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'gg.aa.yyyy',
  id,
  disabled,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const selected = parseIsoDate(value);
  const initialView = selected ?? today;
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(initialView));

  // value dışarıdan reset edilince (form clear vs.) görünüm de sıçrayan
  // tarih takip etsin.
  useEffect(() => {
    if (selected) setViewMonth(startOfMonth(selected));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Outside click + Escape ile kapat.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pickDay(d: Date) {
    onChange(toIsoDate(d));
    setOpen(false);
  }

  function nudgeMonth(delta: number) {
    setViewMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + delta);
      return next;
    });
  }

  function nudgeYear(delta: number) {
    setViewMonth((prev) => {
      const next = new Date(prev);
      next.setFullYear(prev.getFullYear() + delta);
      return next;
    });
  }

  const grid = buildMonthGrid(viewMonth);
  const display = formatTrDisplay(value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className="w-full px-3 py-2 text-sm text-left bg-white border border-zinc-200 rounded-lg outline-none transition-colors focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 hover:border-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between gap-2"
      >
        <span className={display ? 'text-zinc-900' : 'text-zinc-400'}>
          {display || placeholder}
        </span>
        <svg
          className="w-4 h-4 text-zinc-500 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 9h17M8 3.5v3M16 3.5v3" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 left-0 w-[300px] rounded-xl border border-zinc-200 bg-white shadow-xl shadow-black/10 p-3">
          {/* Header: month/year + arrows */}
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => nudgeYear(-1)}
                aria-label="Önceki yıl"
                className="p-1.5 rounded hover:bg-zinc-100 text-zinc-600"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => nudgeMonth(-1)}
                aria-label="Önceki ay"
                className="p-1.5 rounded hover:bg-zinc-100 text-zinc-600"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="text-sm font-semibold text-zinc-800 tabular-nums">
              {TR_MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => nudgeMonth(1)}
                aria-label="Sonraki ay"
                className="p-1.5 rounded hover:bg-zinc-100 text-zinc-600"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => nudgeYear(1)}
                aria-label="Sonraki yıl"
                className="p-1.5 rounded hover:bg-zinc-100 text-zinc-600"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 17l5-5-5-5M6 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {TR_WEEKDAYS_SHORT.map((w) => (
              <div
                key={w}
                className="text-[10px] font-semibold text-zinc-400 text-center py-1.5 uppercase tracking-wider"
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((d) => {
              const isCurrentMonth = d.getMonth() === viewMonth.getMonth();
              const isSelected = selected ? isSameDay(d, selected) : false;
              const isToday = isSameDay(d, today);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => pickDay(d)}
                  className={[
                    'h-9 text-sm rounded-md font-medium tabular-nums transition-colors',
                    isSelected
                      ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                      : isCurrentMonth
                        ? 'text-zinc-800 hover:bg-zinc-100'
                        : 'text-zinc-300 hover:bg-zinc-50',
                    !isSelected && isToday ? 'ring-1 ring-zinc-900/20' : '',
                  ].join(' ')}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              Temizle
            </button>
            <button
              type="button"
              onClick={() => pickDay(today)}
              className="text-xs font-semibold text-zinc-900 hover:text-zinc-700 transition-colors"
            >
              Bugün
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
