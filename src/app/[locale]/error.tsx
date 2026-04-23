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
          eyebrow: 'Teknik arıza',
          title: 'Bir şeyler ters gitti',
          desc: 'Beklenmedik bir hata oluştu. Tekrar denemek bazen işe yarar.',
          retry: 'Tekrar dene',
          home: 'Ana sayfaya dön',
        }
      : {
          eyebrow: 'Technical fault',
          title: 'Something went wrong',
          desc: 'An unexpected error occurred. Sometimes a retry is all it takes.',
          retry: 'Try again',
          home: 'Return home',
        };

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen flex items-center justify-center px-6">
      {/* 404'le aynı dekoratif dil — gradient + oversized watermark. */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.05),transparent_55%)] pointer-events-none"
        aria-hidden="true"
      />
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-editorial font-black text-white/[0.03] select-none pointer-events-none leading-none"
        style={{ fontSize: 'clamp(10rem, 25vw, 22rem)' }}
        aria-hidden="true"
      >
        500
      </span>

      <div className="relative max-w-xl text-center">
        <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500 font-bold mb-6 flex items-center justify-center gap-3">
          <span className="w-10 h-px bg-zinc-600" />
          {copy.eyebrow}
          <span className="w-10 h-px bg-zinc-600" />
        </p>
        <h1
          className="font-editorial tracking-[-0.02em] leading-[1] mb-6"
          style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.75rem)', fontWeight: 700 }}
        >
          {copy.title}
        </h1>
        <p className="text-zinc-400 text-base md:text-lg leading-relaxed mb-8 max-w-md mx-auto font-light italic">
          {copy.desc}
        </p>
        {error?.digest && (
          <p className="text-[10px] tracking-widest text-zinc-600 font-mono mb-8 break-all">
            ref: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => unstable_retry()}
            className="px-8 py-3.5 bg-white text-black font-bold rounded-full text-sm hover:bg-zinc-200 transition-colors"
          >
            {copy.retry}
          </button>
          <Link
            href={`/${locale}`}
            className="px-8 py-3.5 border border-white/15 text-white font-medium rounded-full text-sm hover:bg-white/5 hover:border-white/30 transition-colors"
          >
            {copy.home}
          </Link>
        </div>
      </div>
    </div>
  );
}
