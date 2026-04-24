'use client';

import { useCallback, useRef, useState } from 'react';
import TypedConfirmDialog from './TypedConfirmDialog';

/**
 * Imperative confirm hook — `window.confirm` yerine.
 *
 * Neden?
 *   Native browser confirm bir Vercel/Chrome dialogu gibi görünüyor,
 *   site tasarımıyla çelişiyor ("amator duruyor"). Tüm silme/yayın
 *   onaylarının aynı `TypedConfirmDialog` component'ini kullanması
 *   tutarlılık sağlıyor — her yerde aynı ikon, aynı tipografi, aynı
 *   loading state.
 *
 * Kullanım:
 *   const { confirm, dialog } = useConfirm();
 *
 *   async function onDelete() {
 *     const ok = await confirm({
 *       title: 'Şarkı silinecek',
 *       description: '"Here Comes the Sun"',
 *       confirmLabel: 'Sil',
 *     });
 *     if (!ok) return;
 *     // ... silme işlemi
 *   }
 *
 *   return <>{dialog}{/ rest of UI /}</>;
 */

interface ConfirmOptions {
  title: string;
  /** Subtitle — entity adı ya da kısa açıklama. */
  description?: string;
  /** Onay butonu metni. */
  confirmLabel?: string;
}

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ title: '' });
  // Promise resolve'i açılan dialoğun cevabına bağlı — ref'te tutup
  // onay/iptal callback'lerinden tetikliyoruz.
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handle = useCallback((ok: boolean) => {
    setOpen(false);
    resolverRef.current?.(ok);
    resolverRef.current = null;
  }, []);

  const dialog = open ? (
    <TypedConfirmDialog
      open={true}
      title={opts.title}
      entityName={opts.description ?? ''}
      description={opts.description}
      confirmLabel={opts.confirmLabel ?? 'Onayla'}
      requireTypedConfirm={false}
      onConfirm={() => handle(true)}
      onCancel={() => handle(false)}
    />
  ) : null;

  return { confirm, dialog };
}
