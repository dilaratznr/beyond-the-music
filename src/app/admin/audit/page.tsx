'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { TableSkeleton } from '@/components/admin/Loading';

interface AuditItem {
  id: string;
  event: string;
  actorId: string | null;
  actor: { username: string; name: string; email: string | null } | null;
  targetId: string | null;
  targetType: string | null;
  ipHash: string | null;
  userAgent: string | null;
  detail: string | null;
  createdAt: string;
}

interface AuditResponse {
  items: AuditItem[];
  total: number;
  page: number;
  totalPages: number;
}

const PER_PAGE = 50;

// Event etiketleri — TR/insan-okur
const EVENT_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Giriş başarılı',
  LOGIN_FAILURE: 'Giriş başarısız',
  LOGIN_BLOCKED_RATE_LIMIT: 'Giriş engellendi (rate-limit)',
  LOGIN_BLOCKED_DISABLED: 'Giriş engellendi (pasif hesap)',
  LOGIN_PASSWORD_OK_AWAITING_2FA: '2FA bekleniyor',
  LOGIN_PASSWORD_OK_AWAITING_2FA_ENROLL: '2FA kuruluma yönlendirildi',
  LOGOUT: 'Çıkış',
  USER_CREATED: 'Kullanıcı oluşturuldu',
  USER_DELETED: 'Kullanıcı silindi',
  USER_ACTIVATED: 'Kullanıcı aktifleştirildi',
  USER_DEACTIVATED: 'Kullanıcı pasifleştirildi',
  USER_ROLE_CHANGED: 'Rol değişti',
  PERMISSIONS_CHANGED: 'Yetkiler değişti',
  TWO_FACTOR_ENABLED: '2FA açıldı',
  TWO_FACTOR_DISABLED_BY_ADMIN: '2FA kapatıldı (admin tarafından)',
  TWO_FACTOR_SETUP_FAILED: '2FA kurulum başarısız',
  TWO_FACTOR_ENROLL_SKIPPED: '2FA kurulumu atlandı',
  PASSWORD_CHANGED: 'Şifre değiştirildi',
  SUPER_ADMIN_SWAPPED: 'Super Admin değişti',
};

// "Kötü" eventler — kırmızıya boyanır
const ALERT_EVENTS = new Set([
  'LOGIN_FAILURE',
  'LOGIN_BLOCKED_RATE_LIMIT',
  'LOGIN_BLOCKED_DISABLED',
  'TWO_FACTOR_SETUP_FAILED',
  'USER_DELETED',
  'TWO_FACTOR_DISABLED_BY_ADMIN',
]);

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return `${sec}sn önce`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}dk önce`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}sa önce`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}gün önce`;
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AuditLogPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [page, setPage] = useState(1);
  const [eventFilter, setEventFilter] = useState('');

  const isSuperAdmin =
    (session?.user as { role?: string } | undefined)?.role === 'SUPER_ADMIN';

  const queryString = new URLSearchParams({
    page: String(page),
    limit: String(PER_PAGE),
  });
  if (eventFilter) queryString.set('event', eventFilter);

  const { data, isLoading } = useSWR<AuditResponse>(
    isSuperAdmin ? `/api/admin/audit?${queryString}` : null,
  );

  if (status === 'loading') {
    return <TableSkeleton rows={6} showHeader={false} />;
  }
  if (status === 'authenticated' && !isSuperAdmin) {
    router.replace('/admin/dashboard');
    return null;
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
          Denetim Kayıtları
        </h1>
        <p className="text-[13px] text-zinc-500 mt-0.5">
          {total} kayıt · giriş, kullanıcı yönetimi, 2FA ve hassas aksiyonlar.
          IP adresleri SHA-256 ile hash&apos;lenmiş.
        </p>
      </div>

      {/* Event filter chips */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-3 mb-4 flex flex-wrap gap-1.5">
        <FilterChip active={eventFilter === ''} onClick={() => { setEventFilter(''); setPage(1); }}>
          Tümü
        </FilterChip>
        {[
          ['LOGIN_FAILURE', 'Başarısız giriş'],
          ['LOGIN_SUCCESS', 'Başarılı giriş'],
          ['USER_CREATED', 'Kullanıcı oluşturma'],
          ['USER_DELETED', 'Kullanıcı silme'],
          ['USER_ROLE_CHANGED', 'Rol değişimi'],
          ['TWO_FACTOR_DISABLED_BY_ADMIN', '2FA kapatma'],
        ].map(([ev, label]) => (
          <FilterChip
            key={ev}
            active={eventFilter === ev}
            onClick={() => { setEventFilter(ev); setPage(1); }}
          >
            {label}
          </FilterChip>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} showHeader={false} />
      ) : items.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg py-16 text-center">
          <p className="text-sm text-zinc-100 font-medium">Kayıt yok</p>
          <p className="text-xs text-zinc-500 mt-1">
            {eventFilter ? 'Bu filtreye uyan kayıt bulunamadı' : 'Henüz hiç audit log yazılmamış'}
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-900/80 border-b border-zinc-800 text-left">
                <th className="px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-zinc-500 w-44">
                  Zaman
                </th>
                <th className="px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-zinc-500 w-56">
                  Olay
                </th>
                <th className="px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-zinc-500 w-48">
                  Kullanıcı
                </th>
                <th className="px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-zinc-500">
                  Detay
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-3 py-2 text-zinc-400" title={formatDateTime(item.createdAt)}>
                    {formatRelative(item.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${
                        ALERT_EVENTS.has(item.event)
                          ? 'bg-zinc-900/60 border-l-2 border-l-rose-400 border-zinc-800 text-zinc-200'
                          : 'bg-zinc-900/40 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      {EVENT_LABELS[item.event] ?? item.event}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {item.actor ? (
                      <span>
                        <span className="font-mono text-zinc-400">@{item.actor.username}</span>
                        {item.actor.name && (
                          <span className="text-[10px] text-zinc-500 ml-2">
                            ({item.actor.name})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-zinc-500 italic">— sistem / silinmiş</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-400 break-all">
                    {item.detail || (
                      <span className="text-zinc-600 italic">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="border-t border-zinc-800 px-3 py-2 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">
                Sayfa {page} / {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 rounded-md border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 transition-colors"
                >
                  Önceki
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 rounded-md border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 transition-colors"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
        active
          ? 'bg-white text-zinc-950 border-white'
          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}
