'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Typed-confirm modal for destructive ops. Requires entity name to match,
 * preventing accidental cascade deletes. Shows impact (affected child counts).
 */

export interface ImpactItem {
  label: string;
  count: number;
}

interface Props {
  open: boolean;
  title: string;
  /** Kullanıcının aynen yazması gereken isim (case-insensitive karşılaştırıyoruz). */
  entityName: string;
  /** Silmenin zincirleme etkisi — her satır bir kayıt türü + sayı. */
  impact?: ImpactItem[];
  /** Opsiyonel ekstra açıklama. */
  description?: string;
  /** Onay butonunun metni (varsayılan: "Sil"). */
  confirmLabel?: string;
  /** Loading state — onay sırasında butonu disable etmek için. */
  loading?: boolean;
  /**
   * true → kullanıcı entity adını bire bir yazmak zorunda (typed confirm).
   *        Cascade etkisi olan silmeler için — yanlışlıkla büyük veri kaybını
   *        engeller.
   * false → sadece "Sil / İptal" modal'ı. Hızlı silmelerde de yanlışlıkla
   *        tıklamayı engellemek için yine native confirm yerine bu modal.
   */
  requireTypedConfirm?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TypedConfirmDialog({
  open,
  title,
  entityName,
  impact,
  description,
  confirmLabel = 'Sil',
  loading = false,
  requireTypedConfirm = true,
  onConfirm,
  onCancel,
}: Props) {
  // Input resets on mount (parent unmounts modal on close).
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input after modal animation.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  // ESC ile kapat
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const matches = input.trim().toLowerCase() === entityName.trim().toLowerCase();
  const totalImpact = impact?.reduce((sum, i) => sum + i.count, 0) ?? 0;
  // If typed confirm disabled, always allow (no matching required).
  const canConfirm = requireTypedConfirm ? matches : true;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="typed-confirm-title"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      {/* Backdrop — click cancels (unless loading). */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Kapat"
        onClick={() => !loading && onCancel()}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Zinc frame; color in warning icon/text, not button. */}
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-zinc-900">
          <div className="flex items-start gap-3">
            <span
              className="flex-shrink-0 w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 text-sm mt-0.5"
              aria-hidden="true"
            >
              ⚠
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="typed-confirm-title" className="text-[15px] font-semibold text-zinc-100 tracking-tight">
                {title}
              </h2>
              {/* Subtitle optional; conditional render avoids stray punctuation. */}
              {(entityName || description) && (
                <p className="text-[12px] text-zinc-400 mt-1">
                  {entityName && (
                    <span className="text-zinc-200 font-medium">{entityName}</span>
                  )}
                  {entityName && description ? ' · ' : ''}
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {impact && impact.length > 0 && totalImpact > 0 && (
            <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-2">
                Bu silme sırasında ayrıca kaybolacak
              </p>
              <ul className="space-y-1">
                {impact.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between text-[12px]"
                  >
                    <span className="text-zinc-300">{item.label}</span>
                    <span className="font-mono font-semibold text-zinc-100">
                      {item.count}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                Bu işlem geri alınamaz. Silme sonrası bu kayıtlar veritabanından tamamen kaldırılır.
              </p>
            </div>
          )}

          {requireTypedConfirm ? (
            <div>
              <label
                htmlFor="typed-confirm-input"
                className="block text-[11px] font-semibold text-zinc-300 mb-1.5"
              >
                Onaylamak için <span className="font-mono text-zinc-100">{entityName}</span> yaz
              </label>
              <input
                ref={inputRef}
                id="typed-confirm-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && matches && !loading) {
                    e.preventDefault();
                    onConfirm();
                  }
                }}
                autoComplete="off"
                spellCheck={false}
                placeholder={entityName}
                className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 transition-colors"
              />
            </div>
          ) : (
            <p className="text-sm text-zinc-400 leading-relaxed">
              Bu işlem geri alınamaz. Devam etmek istediğine emin misin?
            </p>
          )}
        </div>

        <div className="px-5 pb-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-2 text-[12px] font-medium text-zinc-300 hover:text-zinc-100 transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm || loading}
            // Primary action white; destructive intent conveyed by icon + warning + typed confirm.
            className="px-4 py-2 text-[12px] font-semibold rounded-md bg-white text-zinc-950 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Siliniyor…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
