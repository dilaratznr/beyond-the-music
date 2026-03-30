export const revalidate = 30;

import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ArchitectDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;

  const architect = await prisma.architect.findUnique({
    where: { slug },
    include: { artists: { include: { artist: true } } },
  });

  if (!architect) notFound();

  const bio = locale === 'tr' ? architect.bioTr : architect.bioEn;

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen pt-20">
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="text-sm text-zinc-500 mb-4">
        <Link href={`/${locale}/architects`} className="hover:text-white">The Architects</Link>
        <span className="mx-1">/</span>
        <span className="text-white font-medium">{architect.name}</span>
      </div>

      <div className="grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{architect.name}</h1>
          <span className="px-3 py-1 bg-zinc-800 rounded-full text-sm mb-6 inline-block">{architect.type.replace('_', ' ')}</span>
          {bio && <div className="prose prose-zinc max-w-none mt-6"><p className="whitespace-pre-line">{bio}</p></div>}

          {architect.artists.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-bold mb-4">Associated Artists</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {architect.artists.map(({ artist, role }) => (
                  <Link key={artist.id} href={`/${locale}/artist/${artist.slug}`}
                    className="p-4 bg-zinc-900 rounded-xl hover:shadow-md transition-shadow">
                    <p className="font-semibold">{artist.name}</p>
                    {role && <p className="text-xs text-zinc-500 mt-1">{role}</p>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        <div>
          {architect.image && <img src={architect.image} alt={architect.name} className="w-full rounded-xl" />}
        </div>
      </div>
    </div>
    </div>
  );
}
