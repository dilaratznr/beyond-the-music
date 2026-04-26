'use client';

import { useState } from 'react';
import { useToast } from '@/components/admin/Toast';
import TypedConfirmDialog, { ImpactItem } from '@/components/admin/TypedConfirmDialog';

/**
 * Common delete button: quick confirm + API call. If 409 with cascade impact,
 * show typed confirm modal. `?force=true` on retry. Backward-compat when no entityName.
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
  // Modal iki modda çalışıyor:
  //   - 'simple': Tıklama sonrası açılan ilk onay. "Silmek istediğinize
  //     emin misiniz?" + İptal/Sil. Yanlışlıkla tıklamaları engeller.
  //   - 'typed': API 409 + impact dönerse açılır. Kullanıcı entity
  //     adını bire bir yazmak zorunda. Cascade riski yüksek silmeler
  //     için (örn. 287 şarkılı bir sanatçı).
  const [mode, setMode] = useState<null | 'simple' | 'typed'>(null);
  const [conflict, setConflict] = useState<ConflictResponse | null>(null);
  const { toast } = useToast();

  async function runDelete(force: boolean) {
    setLoading(true);
    try {
      const url = force ? `${endpoint}?force=true` : endpoint;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data?.requiresConfirmation) {
        // Impact etkisi var — typed confirm'a geçir, modal açık kalsın.
        setConflict(data as ConflictResponse);
        setMode('typed');
        return;
      }

      if (!res.ok) {
        // 409 + requiresConfirmation=false (örn. User+articles) veya
        // başka bir hata — modal kapat, hata göster.
        toast(data?.message || data?.error || 'Silme başarısız', 'error');
        setMode(null);
        setConflict(null);
        return;
      }

      toast('Silindi');
      setMode(null);
      setConflict(null);
      if (onDeleted) onDeleted();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Silme başarısız', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Native window.confirm yerine custom modal. Yanlışlıkla tıklamayı
  // engeller + site tasarımına uygun görünüm.
  function handleInitialClick() {
    setMode('simple');
  }

  function closeModal() {
    if (loading) return;
    setMode(null);
    setConflict(null);
  }

  return (
    <>
      {variant === 'outline' ? (
        <button
          type="button"
          onClick={handleInitialClick}
          disabled={loading}
          // Idle'da nötr zinc — renkli çerçeve/bg yok, editoryal ton.
          // Hover'da sadece metin rose'a döner — "destructive" işareti
          // kelime + ince niyansla, büyük kırmızı blok olmadan.
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium text-zinc-300 bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-rose-300 transition-colors disabled:opacity-50 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/30"
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
          // Ghost variant — liste satırlarında. Idle sade zinc, hover'da
          // nötr bir highlight; "sil" kelimesi aksiyonun anlamını zaten
          // taşıyor, renklendirmeye gerek yok.
          className="text-zinc-400 hover:text-rose-300 hover:bg-zinc-800/60 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/30"
          aria-label={label}
        >
          {loading ? '…' : label}
        </button>
      )}

      {/* Tek modal, iki mod:
          - simple: basit onay, typed input yok
          - typed: API 409 + impact sonrası — entity adını yaz + force sil */}
      {mode && (
        <TypedConfirmDialog
          open={true}
          title={
            mode === 'typed'
              ? (entityKind ? `${entityKind} silinecek` : 'Silme onayı')
              : (entityKind ? `${entityKind} sil` : 'Silme onayı')
          }
          entityName={entityName || 'onaylıyorum'}
          impact={mode === 'typed' ? toImpactList(conflict?.impact) : undefined}
          description={
            mode === 'typed'
              ? conflict?.message
              : entityName
                ? `"${entityName}"`
                : confirmMessage
          }
          confirmLabel={mode === 'typed' ? 'Yine de sil' : 'Sil'}
          loading={loading}
          requireTypedConfirm={mode === 'typed'}
          onConfirm={() => runDelete(mode === 'typed')}
          onCancel={closeModal}
        />
      )}
    </>
  );
}
