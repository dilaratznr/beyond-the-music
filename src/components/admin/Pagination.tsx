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

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-[10px] text-zinc-400">
        {total} sonuçtan {start}–{end} gösteriliyor
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-2 py-1 text-[10px] font-medium rounded-md bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ←
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dot-${i}`} className="px-1 text-[10px] text-zinc-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-7 h-7 text-[10px] font-medium rounded-md transition-colors ${
                p === page ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="px-2 py-1 text-[10px] font-medium rounded-md bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          →
        </button>
      </div>
    </div>
  );
}
