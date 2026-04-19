'use client';

import { useState } from 'react';
import { useToast } from '@/components/admin/Toast';

interface DeleteButtonProps {
  endpoint: string;
  label?: string;
  confirmMessage?: string;
  onDeleted?: () => void;
  /**
   * Visual style. `ghost` (default) is a borderless red text button used in
   * list rows. `outline` is a full button with border + trash icon, intended
   * for form footers where it sits next to Save/Cancel.
   */
  variant?: 'ghost' | 'outline';
}

export default function DeleteButton({
  endpoint,
  label = 'Sil',
  confirmMessage = 'Bu kaydı silmek istediğinizden emin misiniz?',
  onDeleted,
  variant = 'ghost',
}: DeleteButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleDelete() {
    if (!window.confirm(confirmMessage)) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Silme başarısız', 'error');
        return;
      }
      toast('Silindi');
      if (onDeleted) onDeleted();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Silme başarısız', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (variant === 'outline') {
    return (
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-200 hover:border-rose-500/50 transition-colors disabled:opacity-50 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
        aria-label={label}
      >
        {loading ? (
          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        )}
        {loading ? 'Siliniyor…' : label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
      aria-label={label}
    >
      {loading ? '…' : label}
    </button>
  );
}
