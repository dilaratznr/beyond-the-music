export const revalidate = 30;

import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function GenreDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;

  const genre = await prisma.genre.findUnique({
    where: { slug },
    include: {
      parent: true,
      children: { orderBy: { nameTr: 'asc' } },
      articles: {
        where: { status: 'PUBLISHED' },
        include: { author: { select: { name: true } } },
        orderBy: { publishedAt: 'desc' },
      },
      artists: {
        include: { artist: true },
        take: 20,
      },
    },
  });

  if (!genre) notFound();

  const name = locale === 'tr' ? genre.nameTr : genre.nameEn;
  const description = locale === 'tr' ? genre.descriptionTr : genre.descriptionEn;

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen pt-20">
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-zinc-500 mb-4">
        <Link href={`/${locale}/genre`} className="hover:text-white">Genre</Link>
        {genre.parent && (
          <><span className="mx-1">/</span><Link href={`/${locale}/genre/${genre.parent.slug}`} className="hover:text-white">{locale === 'tr' ? genre.parent.nameTr : genre.parent.nameEn}</Link></>
        )}
        <span className="mx-1">/</span>
        <span className="text-white font-medium">{name}</span>
      </div>

      <div className="grid md:grid-cols-3 gap-12">
        {/* Content */}
        <div className="md:col-span-2">
          <h1 className="text-3xl md:text-4xl font-bold mb-6">{name}</h1>
          {description && (
            <div className="prose prose-zinc max-w-none text-zinc-300 leading-relaxed">
              <p>{description}</p>
            </div>
          )}

          {/* Articles */}
          {genre.articles.length > 0 && (
            <div className="mt-12 space-y-6">
              {genre.articles.map((article) => (
                <Link key={article.id} href={`/${locale}/article/${article.slug}`}
                  className="block p-6 bg-zinc-900 rounded-xl hover:shadow-md transition-shadow">
                  <span className="text-xs text-zinc-500 uppercase">{article.category.replace(/_/g, ' ')}</span>
                  <h3 className="text-xl font-bold mt-1">{locale === 'tr' ? article.titleTr : article.titleEn}</h3>
                  <p className="text-sm text-zinc-500 mt-2">{article.author.name}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {genre.image && (
            <img src={genre.image} alt={name} className="w-full rounded-xl" />
          )}

          {genre.children.length > 0 && (
            <div>
              <h3 className="font-bold text-lg mb-3">Subgenres</h3>
              <div className="flex flex-wrap gap-2">
                {genre.children.map((child) => (
                  <Link key={child.id} href={`/${locale}/genre/${child.slug}`}
                    className="px-3 py-1 bg-zinc-800 rounded-full text-sm hover:bg-zinc-800 transition-colors">
                    {locale === 'tr' ? child.nameTr : child.nameEn}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {genre.artists.length > 0 && (
            <div>
              <h3 className="font-bold text-lg mb-3">Artists</h3>
              <ul className="space-y-2">
                {genre.artists.map(({ artist }) => (
                  <li key={artist.id}>
                    <Link href={`/${locale}/artist/${artist.slug}`} className="text-sm text-zinc-400 hover:text-white">
                      {artist.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
