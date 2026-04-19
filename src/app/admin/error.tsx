'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[admin]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-zinc-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-zinc-200 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.732-3L13.732 4a2 2 0 00-3.464 0L3.268 16A2 2 0 005 19z" />
          </svg>
        </div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-rose-600 font-semibold mb-2">
          Yönetim Hatası
        </p>
        <h1 className="text-2xl font-bold text-zinc-900 mb-3 tracking-tight">
          Bir şeyler ters gitti
        </h1>
        <p className="text-zinc-600 mb-6 text-sm leading-relaxed">
          Yönetim panelinde beklenmeyen bir hata oluştu. Tekrar denemek isteyebilir
          ya da panele geri dönebilirsiniz.
        </p>
        {error?.digest && (
          <p className="text-[10px] text-zinc-400 font-mono mb-6 break-all">
            ref: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => unstable_retry()}
            className="px-5 py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors"
          >
            Tekrar Dene
          </button>
          <Link
            href="/admin"
            className="px-5 py-2.5 border border-zinc-200 text-zinc-900 text-sm font-semibold rounded-lg hover:bg-zinc-50 transition-colors"
          >
            Panele Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
