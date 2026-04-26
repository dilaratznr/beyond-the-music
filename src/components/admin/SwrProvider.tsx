'use client';

import { SWRConfig } from 'swr';

/**
 * Global SWR configuration for admin panel.
 *
 * Stale-while-revalidate stratejisi: kullanıcı bir sayfaya geri döndüğünde
 * cache'lenmiş veriyi anında gösteriyoruz, arka planda yeni fetch yapıp
 * fark varsa UI'ı güncelliyoruz. Bu sayede her sekme tıklamasında skeleton
 * gözükmüyor.
 *
 * Davranış kararları:
 *   - revalidateOnFocus: true → tab'a geri dönünce yenile (başka cihazda
 *     değişiklik yapılmış olabilir)
 *   - revalidateOnReconnect: true → network kopup gelince yenile
 *   - dedupingInterval: 2s → aynı endpoint'e 2sn içinde tekrar istek
 *     gelirse network'e gitme, cache'ten dön
 *   - Default fetcher: throw on non-2xx (hata yakalama UI'da consistent)
 */
export default function SwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: defaultFetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 2000,
        // 5 saniye içinde aynı key'e gelen tekrar istekleri batch'le
        // (race condition / hızlı navigasyon koruması).
        focusThrottleInterval: 5000,
        // Hata sonrası retry: 3 kez, exponential backoff
        errorRetryCount: 3,
        errorRetryInterval: 1000,
        // 401 / 403'lerde retry yapma — auth hatasıysa zaten redirect olur
        shouldRetryOnError: (err) => {
          const status = (err as { status?: number })?.status;
          return status !== 401 && status !== 403 && status !== 404;
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}

/**
 * Default fetcher — JSON API call, 2xx dışında SwrError fırlatır.
 * Status kodu hata objesinde tutulur, retry stratejisi buna bakar.
 */
async function defaultFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    const err = new Error(`Fetch failed: ${res.status} ${res.statusText}`) as Error & {
      status: number;
      info?: unknown;
    };
    err.status = res.status;
    try {
      err.info = await res.json();
    } catch {
      /* body json değilse ignore */
    }
    throw err;
  }
  return res.json() as Promise<T>;
}
