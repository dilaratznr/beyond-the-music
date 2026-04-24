/**
 * Entity status pill — DRAFT / PENDING_REVIEW / PUBLISHED.
 *
 * Editoryal ton: tek renkli zinc pill + 6px'lik renkli dot. Renk
 * anlamı:
 *   - PUBLISHED → emerald (canlı siteye düşmüş)
 *   - PENDING_REVIEW → amber (Super Admin onayı bekleniyor)
 *   - DRAFT → zinc (ne yayın, ne kuyruk — editör çalışmaya devam ediyor)
 *
 * Dot minimal tutuluyor; geniş renkli bloklar editoryal dili bozuyordu.
 */

type EntityStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED';

interface Props {
  status: EntityStatus | string;
  /** Compact variant: sadece dot + ton (etiketi gizle). */
  compact?: boolean;
}

const LABELS: Record<EntityStatus, string> = {
  DRAFT: 'Taslak',
  PENDING_REVIEW: 'Onay bekliyor',
  PUBLISHED: 'Yayında',
};

const DOT_COLORS: Record<EntityStatus, string> = {
  DRAFT: 'bg-zinc-500',
  PENDING_REVIEW: 'bg-amber-400',
  PUBLISHED: 'bg-emerald-400',
};

export default function StatusPill({ status, compact = false }: Props) {
  const key = (status in LABELS ? status : 'DRAFT') as EntityStatus;
  const label = LABELS[key];
  const dot = DOT_COLORS[key];

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1.5"
        title={label}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-[10px] rounded-full uppercase tracking-wider font-medium">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
