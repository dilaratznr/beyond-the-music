'use client';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total: number;
  perPage: number;
}

export default function Pagination({ page, totalPages, onPageChange, total, perPage }: Props) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const baseBtn =
    'h-7 px-2 min-w-[28px] inline-flex items-center justify-center text-[11px] font-medium rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-[11px] text-zinc-500">
        {total} sonuçtan {start}–{end} gösteriliyor
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={`${baseBtn} bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white`}
          aria-label="Önceki sayfa"
        >
          ←
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dot-${i}`} className="px-1 text-[11px] text-zinc-600">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`${baseBtn} ${
                p === page
                  ? 'bg-white border-white text-zinc-950'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className={`${baseBtn} bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white`}
          aria-label="Sonraki sayfa"
        >
          →
        </button>
      </div>
    </div>
  );
}
