'use client';

/**
 * Review notices: (1) canPublish=false → needs Super Admin approval,
 * (2) lastRejection → admin note + timestamp if previously rejected.
 * Neutral zinc + left dot (no color block).
 */

interface Props {
  section: string;
  canPublish: boolean | null;
  /** Optional: GET response'tan gelir. */
  lastRejection?: {
    reviewNote: string | null;
    reviewedAt: string | Date | null;
    reviewedBy: { name: string } | null;
  } | null;
}

const SECTION_WORD: Record<string, string> = {
  ARTIST: 'sanatçı',
  ALBUM: 'albüm',
  ARCHITECT: 'mimar',
  GENRE: 'tür',
  LISTENING_PATH: 'rota',
  ARTICLE: 'makale',
};

function formatDate(raw: string | Date | null | undefined): string {
  if (!raw) return '';
  try {
    const d = typeof raw === 'string' ? new Date(raw) : raw;
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function ReviewNotice({ section, canPublish, lastRejection }: Props) {
  const word = SECTION_WORD[section] ?? 'kayıt';
  const hasRejection = lastRejection && (lastRejection.reviewNote || lastRejection.reviewedAt);
  const hasInfo = canPublish === false;

  if (!hasRejection && !hasInfo) return null;

  return (
    <div className="space-y-2">
      {hasRejection && (
        <div className="flex items-start gap-2 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
          <span
            className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-zinc-100 font-medium">
              Bu {word} daha önce reddedilmiş
            </p>
            {lastRejection!.reviewNote && (
              <p className="text-[12px] text-zinc-300 mt-1 leading-relaxed whitespace-pre-wrap">
                “{lastRejection!.reviewNote}”
              </p>
            )}
            <p className="text-[11px] text-zinc-500 mt-1.5">
              {lastRejection!.reviewedBy?.name
                ? `${lastRejection!.reviewedBy.name} · `
                : ''}
              {formatDate(lastRejection!.reviewedAt)}
            </p>
          </div>
        </div>
      )}
      {hasInfo && (
        <div className="flex items-start gap-2 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
          <span
            className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
            aria-hidden="true"
          />
          <p className="text-[12px] text-zinc-300 leading-relaxed">
            <span className="text-zinc-100 font-medium">Onaya gidecek.</span>{' '}
            Yayın yetkin olmadığı için kaydettiğinde bu {word} Super Admin
            onayını bekler; onaylanana kadar siteden kaldırılır.
          </p>
        </div>
      )}
    </div>
  );
}
