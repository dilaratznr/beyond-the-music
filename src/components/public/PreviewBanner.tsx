/**
 * Admin "Önizleme" modunda public detay sayfalarının en üstünde duran
 * uyarı banner'ı. Editöre net bir şekilde "bu içerik henüz yayında değil"
 * sinyali verir, "Düzenle" ile bir tıkla admin formuna döner.
 *
 * Server component — auth ya da state yok, sadece pure prop tabanlı render.
 * Article, Album veya başka bir yayın akışı modeli için yeniden kullanılabilir.
 */

import Link from 'next/link';

type EntityStatus = 'DRAFT' | 'SCHEDULED' | 'PENDING_REVIEW' | string;

interface Props {
  /** İçeriğin gerçek durumu (banner mesajını şekillendirir). */
  status: EntityStatus;
  /** SCHEDULED için "şu tarihte yayına alınacak" satırını besler. */
  publishedAt?: Date | null;
  /** "Düzenle" linkinin hedefi — admin form sayfası. */
  editHref: string;
  /** UI dili. */
  locale: string;
}

const LABEL_TR: Record<string, string> = {
  DRAFT: 'TASLAK',
  SCHEDULED: 'ZAMANLANMIŞ',
  PENDING_REVIEW: 'ONAY BEKLİYOR',
};

const LABEL_EN: Record<string, string> = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  PENDING_REVIEW: 'PENDING REVIEW',
};

export default function PreviewBanner({ status, publishedAt, editHref, locale }: Props) {
  const tr = locale === 'tr';
  const statusLabel = (tr ? LABEL_TR : LABEL_EN)[status] ?? status;

  // SCHEDULED için ekstra satır: "12 Mayıs 14:00'te yayınlanacak"
  let scheduledLine: string | null = null;
  if (status === 'SCHEDULED' && publishedAt) {
    const d = new Date(publishedAt);
    const formatted = d.toLocaleString(tr ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
    scheduledLine = tr
      ? `Yayın zamanı: ${formatted}`
      : `Will publish at: ${formatted}`;
  }

  return (
    <div
      className="sticky top-0 z-50 bg-amber-500/10 border-b border-amber-400/30 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 py-2.5 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className="inline-block w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 animate-pulse"
            aria-hidden="true"
          />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-300 flex-shrink-0">
            {tr ? 'Önizleme' : 'Preview'}
          </span>
          <span className="text-zinc-600" aria-hidden="true">·</span>
          <span className="text-[11px] font-semibold text-zinc-100 flex-shrink-0">
            {statusLabel}
          </span>
          <span className="text-[11px] text-zinc-400 truncate">
            {tr
              ? '— Bu içerik henüz yayında değil, sadece sen görüyorsun.'
              : '— This content is not published yet, only you can see it.'}
          </span>
          {scheduledLine && (
            <>
              <span className="text-zinc-600" aria-hidden="true">·</span>
              <span className="text-[11px] text-amber-200 flex-shrink-0">
                {scheduledLine}
              </span>
            </>
          )}
        </div>
        <Link
          href={editHref}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-100 hover:text-white rounded-md text-[11px] font-semibold transition-colors"
        >
          {tr ? 'Düzenle' : 'Edit'} →
        </Link>
      </div>
    </div>
  );
}
