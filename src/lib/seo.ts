import type { Metadata } from 'next';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://beyondthemusic.app';

export function stripHtml(html: string | null | undefined, max = 160): string {
  if (!html) return '';
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}

interface PageMetaOptions {
  title: string;
  description?: string | null;
  locale: string;
  path: string;
  image?: string | null;
  type?: 'article' | 'website' | 'profile';
  publishedTime?: Date | string | null;
  authorName?: string | null;
}

export function buildPageMetadata({
  title,
  description,
  locale,
  path,
  image,
  type = 'website',
  publishedTime,
  authorName,
}: PageMetaOptions): Metadata {
  const otherLocale = locale === 'tr' ? 'en' : 'tr';
  const url = `${SITE_URL}/${locale}${path}`;
  const altUrl = `${SITE_URL}/${otherLocale}${path}`;
  const desc = description?.trim() || undefined;

  return {
    title,
    description: desc,
    alternates: {
      canonical: url,
      languages: {
        [locale]: url,
        [otherLocale]: altUrl,
      },
    },
    openGraph: {
      type,
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      alternateLocale: locale === 'tr' ? 'en_US' : 'tr_TR',
      siteName: 'Beyond The Music',
      title,
      description: desc,
      url,
      images: image ? [{ url: image }] : undefined,
      ...(type === 'article' && publishedTime
        ? { publishedTime: new Date(publishedTime).toISOString() }
        : {}),
      ...(type === 'article' && authorName ? { authors: [authorName] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description: desc,
      images: image ? [image] : undefined,
    },
  };
}
