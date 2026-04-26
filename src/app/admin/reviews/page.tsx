'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { useToast } from '@/components/admin/Toast';
import Pagination from '@/components/admin/Pagination';

const PER_PAGE = 15;

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface Review {
  id: string;
  section: string;
  entityId: string;
  entityTitle: string;
  changeType: 'CREATE' | 'EDIT';
  status: ReviewStatus;
  reviewNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  submittedBy: { id: string; name: string; email: string; role: string };
  reviewedBy: { id: string; name: string; email: string } | null;
}

const SECTION_LABELS: Record<string, string> = {
  ARTICLE: 'Makale',
  ARTIST: 'Sanatçı',
  ALBUM: 'Albüm',
  GENRE: 'Tür',
  ARCHITECT: 'Mimar',
  LISTENING_PATH: 'Dinleme Rotası',
  THEORY: 'Teori',
  AI_MUSIC: 'AI Müzik',
  MEDIA: 'Medya',
};

const SECTION_HREF: Record<string, (id: string) => string> = {
  ARTICLE: (id) => `/admin/articles/${id}`,
  ARTIST: (id) => `/admin/artists/${id}`,
  ALBUM: (id) => `/admin/albums/${id}`,
  GENRE: (id) => `/admin/genres/${id}`,
  ARCHITECT: (id) => `/admin/architects/${id}`,
  LISTENING_PATH: (id) => `/admin/listening-paths/${id}`,
};

export default function ReviewsPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ReviewStatus>('PENDING');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: response, mutate, isLoading } = useSWR<{
    items?: Review[];
    total?: number;
  } | Review[]>(
    `/api/admin/reviews?status=${filter}&page=${page}&limit=${PER_PAGE}`,
  );

  // Eski (array) ve yeni (paginated) response format'ını ikisi de destekle.
  // total ve reviews doğrudan response'tan derive ediliyor — render-time
  // setState yok.
  const reviews: Review[] = Array.isArray(response)
    ? response
    : response?.items ?? [];
  const total = Array.isArray(response) ? response.length : response?.total ?? 0;

  // Filtre değişince sayfayı 1'e döndür — aksi halde boş sayfada kalabilirsin.
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const refresh = useCallback(() => mutate(), [mutate]);

  // Sidebar badge'inin güncel sayıyı hemen yakalaması için — sayfa
  // içindeki refresh zaten liste'yi tazeliyor, ama sidebar ayrı bir
  // component, pathname değişmediği için kendi fetch'ini tetiklemiyor.
  function notifyReviewsChanged() {
    window.dispatchEvent(new CustomEvent('btm:reviews-changed'));
  }

  async function handleApprove(review: Review) {
    setBusyId(review.id);
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}/approve`, { method: 'POST' });
      if (res.ok) {
        toast('İçerik onaylandı ve yayınlandı');
        refresh();
        notifyReviewsChanged();
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || 'Onaylama hatası', 'error');
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(review: Review) {
    setBusyId(review.id);
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: rejectNote }),
      });
      if (res.ok) {
        toast('İçerik reddedildi, taslağa alındı');
        setRejectingId(null);
        setRejectNote('');
        refresh();
        notifyReviewsChanged();
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || 'Reddetme hatası', 'error');
      }
    } finally {
      setBusyId(null);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-xl font-semibold text-zinc-100 mb-2">Onay Bekleyenler</h1>
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm rounded-md">
          Bu sayfa yalnızca Super Admin kullanıcıları içindir.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Onay Bekleyenler</h1>
          <p className="text-[13px] text-zinc-500 mt-1">
            canPublish yetkisi olmayan editörlerin yayına gönderdiği içerikler burada beklenir.
            Onayladığında içerik sitede yayınlanır; reddettiğinde taslağa geri döner.
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="inline-flex bg-zinc-900 border border-zinc-800 rounded-md p-0.5 mb-5">
        {(['PENDING', 'APPROVED', 'REJECTED'] as ReviewStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              filter === s
                ? 'bg-white text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {s === 'PENDING' ? 'Bekleyen' : s === 'APPROVED' ? 'Onaylanmış' : 'Reddedilmiş'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 bg-zinc-900/40 rounded-lg border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="px-5 py-14 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-lg text-center">
          <p className="text-sm text-zinc-400">
            {filter === 'PENDING'
              ? 'Onay bekleyen içerik yok.'
              : filter === 'APPROVED'
                ? 'Onaylanmış kayıt yok.'
                : 'Reddedilmiş kayıt yok.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => {
            const sectionLabel = SECTION_LABELS[review.section] ?? review.section;
            const editHref = SECTION_HREF[review.section]?.(review.entityId);
            const date = new Date(review.submittedAt);
            const when = `${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
            const isRejectingThis = rejectingId === review.id;

            return (
              <li
                key={review.id}
                className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">
                      <span className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded">
                        {sectionLabel}
                      </span>
                      <span className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded">
                        {review.changeType === 'CREATE' ? 'Yeni' : 'Düzenleme'}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100 truncate">
                      {editHref ? (
                        <Link href={editHref} className="hover:underline">
                          {review.entityTitle}
                        </Link>
                      ) : (
                        review.entityTitle
                      )}
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      <span className="text-zinc-400">{review.submittedBy.name}</span> gönderdi · {when}
                    </p>
                    {review.status === 'REJECTED' && review.reviewNote && (
                      <p className="text-[12px] text-zinc-300 mt-2 px-3 py-2 bg-zinc-900/40 border border-zinc-800 rounded-md">
                        <span className="font-semibold text-zinc-400">Red notu: </span>
                        {review.reviewNote}
                      </p>
                    )}
                    {review.status !== 'PENDING' && review.reviewedBy && review.reviewedAt && (
                      <p className="text-[10px] text-zinc-600 mt-1">
                        {review.reviewedBy.name} ·{' '}
                        {new Date(review.reviewedAt).toLocaleString('tr-TR')}
                      </p>
                    )}
                  </div>

                  {review.status === 'PENDING' && (
                    <div className="flex items-center gap-2">
                      {editHref && (
                        <Link
                          href={editHref}
                          className="px-3 py-1.5 text-[11px] font-medium text-zinc-300 border border-zinc-700 rounded-md hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                          Görüntüle
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => setRejectingId(review.id)}
                        disabled={busyId === review.id}
                        className="px-3 py-1.5 text-[11px] font-medium text-zinc-300 bg-zinc-900/40 border border-zinc-800 rounded-md hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-rose-300 transition-colors disabled:opacity-50"
                      >
                        Reddet
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(review)}
                        disabled={busyId === review.id}
                        className="px-3 py-1.5 text-[11px] font-semibold text-zinc-950 bg-white rounded-md hover:bg-zinc-200 transition-colors disabled:opacity-50"
                      >
                        {busyId === review.id ? 'İşleniyor…' : 'Onayla'}
                      </button>
                    </div>
                  )}
                </div>

                {isRejectingThis && (
                  <div className="pt-3 border-t border-zinc-800 space-y-2">
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Red Notu (opsiyonel)
                    </label>
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      rows={2}
                      placeholder="Editöre neden reddettiğini kısaca yaz…"
                      className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectNote('');
                        }}
                        className="px-3 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(review)}
                        disabled={busyId === review.id}
                        className="px-3 py-1.5 text-[11px] font-semibold text-zinc-950 bg-white rounded-md hover:bg-zinc-200 transition-colors disabled:opacity-50"
                      >
                        {busyId === review.id ? 'İşleniyor…' : 'Reddi Onayla'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {total > PER_PAGE && (
        <div className="mt-6">
          <Pagination
            page={page}
            totalPages={Math.max(1, Math.ceil(total / PER_PAGE))}
            total={total}
            perPage={PER_PAGE}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
