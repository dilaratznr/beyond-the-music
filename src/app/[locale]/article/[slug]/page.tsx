export const revalidate = 30;

import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ArticleDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;

  const article = await prisma.article.findUnique({
    where: { slug },
    include: {
      author: { select: { name: true } },
      relatedGenre: true,
      relatedArtist: true,
    },
  });

  if (!article || article.status !== 'PUBLISHED') notFound();

  const title = locale === 'tr' ? article.titleTr : article.titleEn;
  const content = locale === 'tr' ? article.contentTr : article.contentEn;

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen pt-20">
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-zinc-500 mb-6">
        {article.relatedGenre && (
          <>
            <Link href={`/${locale}/genre/${article.relatedGenre.slug}`} className="hover:text-white">
              {locale === 'tr' ? article.relatedGenre.nameTr : article.relatedGenre.nameEn}
            </Link>
            <span className="mx-1">/</span>
          </>
        )}
        {article.relatedArtist && (
          <>
            <Link href={`/${locale}/artist/${article.relatedArtist.slug}`} className="hover:text-white">
              {article.relatedArtist.name}
            </Link>
            <span className="mx-1">/</span>
          </>
        )}
        <span className="text-zinc-400">{article.category.replace(/_/g, ' ')}</span>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold mb-4">{title}</h1>

      <div className="flex items-center gap-4 text-sm text-zinc-500 mb-8">
        <span>{article.author.name}</span>
        {article.publishedAt && (
          <span>{new Date(article.publishedAt).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        )}
      </div>

      {article.featuredImage && (
        <img src={article.featuredImage} alt={title} className="w-full rounded-xl mb-8" />
      )}

      {content && (
        <article
          className="prose prose-zinc prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </div>
    </div>
  );
}
