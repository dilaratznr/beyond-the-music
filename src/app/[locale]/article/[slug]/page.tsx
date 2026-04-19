export const revalidate = 30;

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { publishDueArticles } from '@/lib/article-publishing';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildPageMetadata, stripHtml, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug },
    select: {
      titleTr: true,
      titleEn: true,
      contentTr: true,
      contentEn: true,
      featuredImage: true,
      status: true,
      publishedAt: true,
      author: { select: { name: true } },
    },
  });
  if (!article || article.status !== 'PUBLISHED') {
    return { title: locale === 'tr' ? 'Makale bulunamadı' : 'Article not found' };
  }
  const title = locale === 'tr' ? article.titleTr : article.titleEn;
  const description = stripHtml(
    locale === 'tr' ? article.contentTr : article.contentEn,
  );
  return buildPageMetadata({
    title,
    description,
    locale,
    path: `/article/${slug}`,
    image: article.featuredImage,
    type: 'article',
    publishedTime: article.publishedAt,
    authorName: article.author.name,
  });
}

export default async function ArticleDetailPage({ params }: { params: Params }) {
  const { locale, slug } = await params;

  // Flip due-scheduled articles first so a visitor who hits the URL exactly
  // at publish time sees the article instead of a 404.
  await publishDueArticles();

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
  const description = stripHtml(content);
  const articleUrl = `${SITE_URL}/${locale}/article/${slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: article.featuredImage ? [article.featuredImage] : undefined,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt?.toISOString(),
    author: { '@type': 'Person', name: article.author.name },
    publisher: {
      '@type': 'Organization',
      name: 'Beyond The Music',
      url: SITE_URL,
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    inLanguage: locale === 'tr' ? 'tr-TR' : 'en-US',
    articleSection: article.category.replace(/_/g, ' '),
  };

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen pt-20">
    <JsonLd data={jsonLd} />
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
