'use client';

import { useState } from 'react';
import { useToast } from '@/components/admin/Toast';
import TypedConfirmDialog, { ImpactItem } from '@/components/admin/TypedConfirmDialog';

/**
 * Her admin sayfasında ortak silme butonu.
 *
 * Akış:
 *   1. Tıklayınca önce basit bir window.confirm — hızlı silme, bir
 *      klavye yanlışını engellemek için.
 *   2. API çağrısı yapılır. Eğer 409 "requiresConfirmation: true" ile
 *      dönerse, cascade etkisi vardır — kullanıcıya typed confirm modal
 *      gösterilir (entity adını yazarak onayla).
 *   3. Kullanıcı onaylarsa `?force=true` ile tekrar DELETE atılır.
 *   4. 409 "requiresConfirmation: false" (örn. User silme'de foreign key
 *      blokajı) ise force opsiyonu yok — sadece hata mesajı gösterilir.
 *
 * Backward-compat: `entityName` verilmeyen eski kullanımlarda 409
 * impact akışı devreye girmez, sadece toast error gösterilir.
 */
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
  /**
   * Kritik silmelerde (Artist, Album, Architect…) API 409 döner ve
   * cascade etkisini bildirirse, kullanıcıdan bu adı yazmasını isteyen
   * typed confirm modal açılır.
   */
  entityName?: string;
  /**
   * Opsiyonel alt başlık — "sanatçı", "albüm" gibi tür etiketi.
   */
  entityKind?: string;
}

// API 409 response şeması
interface ConflictResponse {
  error: string;
  requiresConfirmation?: boolean;
  impact?: Record<string, number>;
  message?: string;
}

// Impact objesini insan-okur label'a çeviren küçük sözlük
const IMPACT_LABELS: Record<string, string> = {
  albums: 'Albüm',
  songs: 'Şarkı',
  articles: 'Makale',
  artists: 'Sanatçı',
  items: 'Öğe',
  children: 'Alt tür',
  permissions: 'Yetki',
};

function toImpactList(impact?: Record<string, number>): ImpactItem[] {
  if (!impact) return [];
  return Object.entries(impact)
    .filter(([, v]) => v > 0)
    .map(([key, count]) => ({
      label: IMPACT_LABELS[key] ?? key,
      count,
    }));
}

export default function DeleteButton({
  endpoint,
  label = 'Sil',
  confirmMessage = 'Bu kaydı silmek istediğinizden emin misiniz?',
  onDeleted,
  variant = 'ghost',
  entityName,
  entityKind,
}: DeleteButtonProps) {
  const [loading, setLoading] = useState(false);
  const [conflict, setConflict] = useState<ConflictResponse | null>(null);
  const { toast } = useToast();

  async function runDelete(force: boolean) {
    setLoading(true);
    try {
      const url = force ? `${endpoint}?force=true` : endpoint;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data?.requiresConfirmation) {
        // Impact etkisi var — typed confirm modal aç
        setConflict(data as ConflictResponse);
        return;
      }

      if (!res.ok) {
        // 409 + requiresConfirmation=false (örn. User+articles) veya
        // başka bir hata — typed modal açmıyoruz, düz toast yeterli.
        toast(data?.message || data?.error || 'Silme başarısız', 'error');
        return;
      }

      toast('Silindi');
      setConflict(null);
      if (onDeleted) onDeleted();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Silme başarısız', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleInitialClick() {
    if (!window.confirm(confirmMessage)) return;
    await runDelete(false);
  }

  return (
    <>
      {variant === 'outline' ? (
        <button
          type="button"
          onClick={handleInitialClick}
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
      ) : (
        <button
          type="button"
          onClick={handleInitialClick}
          disabled={loading}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
          aria-label={label}
        >
          {loading ? '…' : label}
        </button>
      )}

      {/* Typed confirm modal — sadece backend 409 + requiresConfirmation
          dönerse açılıyor. Conditional render ile her açılışta fresh
          mount olur; input state'i sıfırlanır. entityName yoksa fallback. */}
      {conflict && (
        <TypedConfirmDialog
          open={true}
          title={entityKind ? `${entityKind} silinecek` : 'Silme onayı'}
          entityName={entityName || 'onaylıyorum'}
          impact={toImpactList(conflict.impact)}
          description={conflict.message}
          confirmLabel="Yine de sil"
          loading={loading}
          onConfirm={() => runDelete(true)}
          onCancel={() => {
            if (!loading) setConflict(null);
          }}
        />
      )}
    </>
  );
}
