'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import DeleteButton from '@/components/admin/DeleteButton';
import { IconExternal } from '@/components/admin/Icons';

interface RowActionsProps {
  /** Sitede aç linki için ön önizleme URL'i. Boş bırakılırsa gösterilmez. */
  previewHref?: string | null;
  /** /admin/... altındaki düzenleme sayfası URL'i. */
  editHref: string;
  /** DELETE endpoint'i, örn. /api/artists/abc123. */
  deleteEndpoint: string;
  /** Silme onay metni. */
  deleteConfirm: string;
  /** Silme sonrası callback. */
  onDeleted: () => void;
  /** Ek özel butonlar (önden). */
  leading?: ReactNode;
  /**
   * Aksiyonlar varsayılan olarak hover/focus'ta görünür.
   * Dokunmatik/özel durumlar için her zaman görünür istersen true geç.
   */
  alwaysVisible?: boolean;
}

/**
 * Liste satırlarında tekrar eden "Sitede aç · Düzenle · Sil" üçlüsü.
 * Satırı saran kabın `group` sınıfına sahip olması gerekir.
 */
export default function RowActions({
  previewHref,
  editHref,
  deleteEndpoint,
  deleteConfirm,
  onDeleted,
  leading,
  alwaysVisible = false,
}: RowActionsProps) {
  const visibilityClass = alwaysVisible
    ? ''
    : 'md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 md:transition-opacity';
  return (
    <div className={`flex items-center gap-0.5 flex-shrink-0 ${visibilityClass}`}>
      {leading}
      {previewHref && (
        <Link
          href={previewHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 hover:text-zinc-100 w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/60 transition-colors"
          aria-label="Sitede aç"
          title="Sitede aç"
        >
          <IconExternal size={13} />
        </Link>
      )}
      <Link
        href={editHref}
        className="text-zinc-300 hover:text-white hover:bg-zinc-800 px-2.5 py-1 rounded-md text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/60 transition-colors"
      >
        Düzenle
      </Link>
      <DeleteButton
        endpoint={deleteEndpoint}
        confirmMessage={deleteConfirm}
        onDeleted={onDeleted}
      />
    </div>
  );
}
