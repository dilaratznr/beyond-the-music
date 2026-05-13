'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';

/**
 * Admin sayfa-seviyesinde defense-in-depth yetkilendirme.
 *
 * Middleware (`src/proxy.ts`) admin altındaki tüm path'leri zaten
 * auth'la kapatıyor, API guard'ları da SUPER_ADMIN/EDITOR kontrolü
 * yapıyor — ama eğer URL'i bilen yetkisiz bir editör doğrudan
 * `/admin/settings`'a girerse sayfa boşuna açılıyordu (sadece
 * submit'te API 403 dönüyor, UX'te boşa zaman kaybı).
 *
 * Bu hook:
 *   - "loading": session/SWR henüz yüklenmedi → `{ ready: false }`
 *   - Yetkisiz: dashboard'a redirect, `{ ready: false }`
 *   - Yetkili: `{ ready: true }`
 *
 * Çağıran sayfa `ready=false` ise InlineLoading gösterip akışı bekler.
 *
 * Kullanım:
 *   const { ready } = usePageAccess({ require: 'SUPER_ADMIN' });
 *   const { ready } = usePageAccess({ section: 'ARTICLE', action: 'canEdit' });
 */

interface MeResponse {
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
  isSuperAdmin: boolean;
  sections: Record<
    string,
    { canCreate: boolean; canEdit: boolean; canDelete: boolean; canPublish: boolean }
  >;
}

type Action = 'canCreate' | 'canEdit' | 'canDelete' | 'canPublish';

export function usePageAccess(opts: {
  /** "SUPER_ADMIN" sabit kuralı — section yok, sadece role kontrol. */
  require?: 'SUPER_ADMIN';
  /** Section bazlı yetki: ARTICLE, GENRE, ARTIST, ALBUM, ARCHITECT,
   *  LISTENING_PATH, MEDIA, THEORY, AI_MUSIC. */
  section?: string;
  /** Section verildiyse: bu action'lardan birinin true olması yeterli.
   *  Boş bırakılırsa "herhangi biri" demek (sayfayı görmek için
   *  herhangi bir CRUD yetkisi olması yeter). */
  action?: Action;
}): { ready: boolean; isSuperAdmin: boolean } {
  const router = useRouter();
  const { status } = useSession();
  const { data: me, isLoading } = useSWR<MeResponse>(
    status === 'authenticated' ? '/api/users/me' : null,
  );

  const ready = status === 'authenticated' && !isLoading && !!me;

  useEffect(() => {
    if (!ready || !me) return;

    // SUPER_ADMIN her zaman geçer.
    if (me.isSuperAdmin || me.role === 'SUPER_ADMIN') return;

    // SUPER_ADMIN required ama kullanıcı super değil → redirect.
    if (opts.require === 'SUPER_ADMIN') {
      router.replace('/admin/dashboard');
      return;
    }

    // Section bazlı kontrol.
    if (opts.section) {
      const sec = me.sections?.[opts.section];
      if (!sec) {
        router.replace('/admin/dashboard');
        return;
      }
      if (opts.action) {
        if (!sec[opts.action]) {
          router.replace('/admin/dashboard');
          return;
        }
      } else {
        // Belirli action belirtilmediyse en az birinin true olmasını iste.
        const any = sec.canCreate || sec.canEdit || sec.canDelete || sec.canPublish;
        if (!any) {
          router.replace('/admin/dashboard');
          return;
        }
      }
    }
  }, [ready, me, opts.require, opts.section, opts.action, router]);

  return {
    ready,
    isSuperAdmin: !!(me?.isSuperAdmin || me?.role === 'SUPER_ADMIN'),
  };
}
