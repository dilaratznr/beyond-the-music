'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

/**
 * Shared form primitives for admin create/edit pages.
 *
 * Dark, Vercel / GitHub-style inputs:
 *   - zinc-950 base, zinc-800 border, white focus ring
 *   - subtle hover state, visible placeholder
 */

// Editorial dokunuşlu input stili: zinc-950 bg yerine hafif beyaz tint
// (bg-white/[0.02]) + zinc yerine daha karakterli alt border (iki-ton:
// üst zinc-800, alt zinc-700 — hafif hacim verir). Focus ring daha geniş
// ve yumuşak. Tüm inputlar (text, textarea, select) paylaşıyor.
const inputBase =
  'w-full px-3.5 py-2.5 text-sm text-zinc-100 bg-white/[0.02] border border-zinc-800 rounded-lg outline-none transition-all ' +
  'hover:border-zinc-700 hover:bg-white/[0.04] focus:border-white/40 focus:bg-white/[0.05] focus:ring-4 focus:ring-white/[0.04] ' +
  'placeholder:text-zinc-600 placeholder:italic disabled:opacity-50 disabled:cursor-not-allowed';

export function FieldLabel({
  children,
  htmlFor,
  required,
  hint,
}: {
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between mb-2">
      <label htmlFor={htmlFor} className="text-[11px] font-semibold text-zinc-300 uppercase tracking-[0.08em]">
        {children}
        {required && <span className="text-rose-400 ml-1 normal-case">*</span>}
      </label>
      {hint && <span className="text-[10px] text-zinc-500 italic">{hint}</span>}
    </div>
  );
}

export function FieldHelp({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-zinc-500 mt-1.5">{children}</p>;
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
  disabled,
  autoFocus,
  min,
  max,
  step,
}: {
  id?: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'number' | 'url' | 'email';
  disabled?: boolean;
  autoFocus?: boolean;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      autoFocus={autoFocus}
      min={min}
      max={max}
      step={step}
      className={inputBase}
    />
  );
}

export function TextArea({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={`${inputBase} resize-y min-h-[80px] leading-relaxed`}
    />
  );
}

export function Select({
  id,
  value,
  onChange,
  children,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`${inputBase} cursor-pointer appearance-none pr-8 bg-no-repeat bg-[right_0.75rem_center] bg-[length:14px_14px]`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
      }}
    >
      {children}
    </select>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      {(title || description) && (
        <div className="pb-3 border-b border-white/5">
          {title && (
            <h2 className="text-[11px] font-bold text-zinc-400 tracking-[0.25em] uppercase">
              {title}
            </h2>
          )}
          {description && <p className="text-[12px] text-zinc-500 mt-2 italic leading-relaxed max-w-xl">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Form footer shown at the bottom of create/edit pages.
 *
 * Layout:
 *   [ danger slot ]            [ hint · cancel · save ]
 *
 * The `extra` slot is intended for a destructive action (typically a
 * DeleteButton with variant="outline"). A subtle vertical divider separates
 * it from the main actions so the "destructive zone" reads as distinct.
 *
 * Designed to be dropped directly inside the form — it ships its own
 * card background so callers don't need a wrapper div.
 */
export function FormActions({
  cancelHref,
  cancelLabel = 'İptal',
  submitLabel,
  submittingLabel,
  submitting,
  disabled,
  hint,
  extra,
}: {
  cancelHref?: string;
  cancelLabel?: string;
  submitLabel: string;
  submittingLabel?: string;
  submitting?: boolean;
  disabled?: boolean;
  /** Small muted text shown next to the submit button, e.g. autosave state. */
  hint?: ReactNode;
  /** Destructive / secondary action slot, shown on the left. */
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
      <div className="flex items-center gap-2">{extra}</div>
      <div className="flex items-center gap-2">
        {hint && (
          <span className="text-[11px] text-zinc-500 mr-1 hidden md:inline">{hint}</span>
        )}
        {cancelHref && (
          <Link
            href={cancelHref}
            className="px-3.5 py-2 text-[12px] font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white rounded-md transition-colors"
          >
            {cancelLabel}
          </Link>
        )}
        <button
          type="submit"
          disabled={submitting || disabled}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-zinc-950 text-[12px] font-semibold rounded-md hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <>
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              {submittingLabel || 'Kaydediliyor…'}
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 13l4 4L19 7" />
              </svg>
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="p-3 bg-red-950/40 border border-red-900/60 text-red-300 text-xs rounded-md flex items-start gap-2">
      <span className="text-red-400 font-bold leading-none mt-0.5">!</span>
      <span>{children}</span>
    </div>
  );
}
