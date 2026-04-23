export const revalidate = 30;

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';

/**
 * Prerender every published article at build time. `<Link>` can prefetch
 * the full RSC payload for these routes, so clicks are instant (no server
 * roundtrip). New articles published later fall back to on-demand ISR.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const articles: Array<{ slug: string }> = await prisma.article.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true },
  });
  return articles.map(({ slug }) => ({ slug }));
}
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildPageMetadata, stripHtml, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
// Makale HTML'i tiptap WYSIWYG'den geliyor, DB'de ham HTML olarak
// tutuluyor. Ziyaretçiye basmadan önce DOMPurify ile sanitize ediyoruz —
// admin hesabı ele geçirilse bile yerleştirilen <script>/onerror tarzı
// payload render edilmesin diye (savunma-derinliği). isomorphic-dompurify
// hem server hem browser'da çalışır, tiptap'in ürettiği <p>/<h*>/<a>/<img>
// gibi gerçek markup'ı korurken zararlıyı atar.
import DOMPurify from 'isomorphic-dompurify';

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

  // We used to call `await publishDueArticles()` here so a visitor
  // hitting the URL exactly at publish time would see the article
  // instead of a 404. That DB write-on-read pattern forced Next to
  // bail out of static rendering for the whole detail page. With the
  // ISR `revalidate` of 30s and admin/sitemap triggers flipping
  // scheduled articles, worst-case a visitor sees 404 for up to ~30s
  // after the scheduled publish time — acceptable for a ~10x TTFB
  // win on the common case.
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

  const formattedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(
        locale === 'tr' ? 'tr-TR' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' },
      )
    : null;

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen">
      <JsonLd data={jsonLd} />

      {/* ▸▸▸ FULL-BLEED EDITORIAL HERO ▸▸▸
          Home sayfasındaki hero dilinin aynısı: arka plan görseli, çift
          gradient (üst okunabilirlik + alt fade-to-bg), alttan hizalı
          eyebrow + büyük font-editorial başlık + meta line. */}
      <section className="relative w-full min-h-[72vh] md:min-h-[80vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          {article.featuredImage ? (
            <img
              src={article.featuredImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-[#0a0a0b]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_55%)]" />
              <span
                className="absolute top-10 right-10 font-editorial font-black text-white/5 leading-none select-none"
                style={{ fontSize: 'clamp(8rem, 18vw, 18rem)' }}
                aria-hidden="true"
              >
                {title?.charAt(0) ?? '♪'}
              </span>
            </>
          )}
          {/* Üstten okunabilirlik için hafif koyu, alttan sayfa arkaplanına
              yumuşak geçiş. */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-black/55 to-black/30" />
        </div>

        <div className="relative z-10 w-full max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 pb-14 md:pb-20 pt-32">
          {/* Eyebrow / breadcrumb — home sayfasındaki section eyebrow'ları
              ile aynı tracking ve renk. */}
          <div className="text-[11px] md:text-[12px] tracking-[0.3em] uppercase font-bold text-zinc-300 mb-7 flex items-center gap-3 flex-wrap">
            <span className="w-10 h-px bg-zinc-500" />
            {article.relatedGenre && (
              <>
                <Link
                  href={`/${locale}/genre/${article.relatedGenre.slug}`}
                  className="text-zinc-400 hover:text-white underline-grow pb-1"
                >
                  {locale === 'tr' ? article.relatedGenre.nameTr : article.relatedGenre.nameEn}
                </Link>
                <span className="text-zinc-600">/</span>
              </>
            )}
            {article.relatedArtist && (
              <>
                <Link
                  href={`/${locale}/artist/${article.relatedArtist.slug}`}
                  className="text-zinc-400 hover:text-white underline-grow pb-1"
                >
                  {article.relatedArtist.name}
                </Link>
                <span className="text-zinc-600">/</span>
              </>
            )}
            <span className="text-white">{article.category.replace(/_/g, ' ')}</span>
          </div>

          <h1
            className="font-editorial font-black leading-[1] tracking-[-0.03em] max-w-5xl"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 4rem)' }}
          >
            {title}
          </h1>

          <div className="mt-8 flex items-center gap-5 text-[13px] text-zinc-400 font-medium">
            <span className="text-white">{article.author.name}</span>
            {formattedDate && (
              <>
                <span className="w-8 h-px bg-zinc-600" aria-hidden="true" />
                <span>{formattedDate}</span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ▸▸▸ BODY ▸▸▸
          Dar okuma kolonu (max-w-3xl ~ 48rem). .prose + .article-body
          stil kuralları globals.css'te — tailwind v4'te @tailwindcss/
          typography plugin'i kurulu değil, prose-* modifier'ları no-op
          olurdu. */}
      {content && (
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
          <article
            className="prose article-body max-w-none"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(content, {
                // tiptap'in bastığı etiket seti — img/iframe özellikle
                // izin veriyor: makale içi embed'ler (YouTube, vs.)
                // çalışsın diye. JavaScript event'leri ve <script>
                // varsayılan olarak atılıyor.
                ADD_TAGS: ['iframe'],
                ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'target'],
              }),
            }}
          />
        </div>
      )}
    </div>
  );
}
