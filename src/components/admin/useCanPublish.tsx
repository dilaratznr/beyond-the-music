'use client';

import { useEffect, useState } from 'react';

/**
 * Bir bölüm için mevcut kullanıcının canPublish yetkisi olup olmadığını
 * döndürür. Super Admin her zaman true.
 *
 * /api/users/me endpoint'ini bir kez fetch eder; form sayfalarında buton
 * etiketini "Kaydet" → "Onaya Gönder" olarak değiştirmek için yeterli.
 * Dönüş `null` → henüz yüklenmedi (form yazı göstermeden önce bekleyebilir).
 *
 * Section parametresi UserPermission section key'leri: 'ARTIST', 'ALBUM',
 * 'ARCHITECT', 'GENRE', 'LISTENING_PATH', 'ARTICLE' vs.
 */
export function useCanPublish(section: string): boolean | null {
  const [canPublish, setCanPublish] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const cp = d?.isSuperAdmin || d?.sections?.[section]?.canPublish;
        setCanPublish(!!cp);
      })
      .catch(() => {
        if (!cancelled) setCanPublish(false);
      });
    return () => {
      cancelled = true;
    };
  }, [section]);

  return canPublish;
}
