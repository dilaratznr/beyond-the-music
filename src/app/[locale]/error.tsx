'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function LocaleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale === 'tr' ? 'tr' : 'en';

  const copy =
    locale === 'tr'
      ? {
          title: 'Bir şeyler ters gitti',
          desc: 'Sayfayı tekrar denemek ister misin?',
          retry: 'Tekrar dene',
          home: 'Ana sayfaya dön',
        }
      : {
          title: 'Something went wrong',
          desc: 'Give the page another try.',
          retry: 'Try again',
          home: 'Go home',
        };

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-widest text-emerald-500/60 mb-3">
          Error
        </p>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{copy.title}</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">{copy.desc}</p>
        {error?.digest && (
          <p className="text-xs text-zinc-600 font-mono mb-6 break-all">
            {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => unstable_retry()}
            className="px-5 py-2.5 bg-emerald-500 text-black font-semibold rounded-full hover:bg-emerald-400 transition-colors"
          >
            {copy.retry}
          </button>
          <Link
            href={`/${locale}`}
            className="px-5 py-2.5 border border-white/10 text-white font-semibold rounded-full hover:bg-white/5 transition-colors"
          >
            {copy.home}
          </Link>
        </div>
      </div>
    </div>
  );
}
