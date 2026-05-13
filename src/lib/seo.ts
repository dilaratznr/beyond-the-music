import type { Metadata } from 'next';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://beyondthemusic.app';

/**
 * X / Twitter Card için resmi platform handle'ı. `@` ile başlar. Set
 * edilmezse twitter.site / twitter.creator alanları çıkmaz (geçerli
 * ama analytics impressions kaybı). Env üzerinden override edilebilir:
 *   NEXT_PUBLIC_TWITTER_HANDLE=@beyondthemusic
 */
const TWITTER_HANDLE = process.env.NEXT_PUBLIC_TWITTER_HANDLE || '@beyondthemusic';

/** OG image canonical boyutu — Facebook/Twitter/LinkedIn tarayıcıları
 *  width+height verilmezse fetch sırasında image'i discover'lamak için
 *  bir round-trip daha atıyor; vermek share preview'i hızlandırıyor. */
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

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
  /**
   * Arama motorları bu sayfayı indekslemesin. Admin "preview" akışında
   * yayınlanmamış bir içeriği gerçek public URL'inde göstereceğimiz için
   * kullanılır — DRAFT/SCHEDULED içeriğin Google'a sızmasını önler.
   */
  noIndex?: boolean;
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
  noIndex = false,
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
        // `x-default` tells search engines which URL to show when the
        // user's language preference doesn't match either locale.
        // We point it at the TR version because our root (`/`) redirects
        // to `/tr`, and TR is our primary audience.
        'x-default': `${SITE_URL}/tr${path}`,
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
      images: image
        ? [
            {
              url: image,
              width: OG_IMAGE_WIDTH,
              height: OG_IMAGE_HEIGHT,
              alt: title,
            },
          ]
        : undefined,
      ...(type === 'article' && publishedTime
        ? { publishedTime: new Date(publishedTime).toISOString() }
        : {}),
      ...(type === 'article' && authorName ? { authors: [authorName] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      // `site` = içeriğin yayıncısı, `creator` = makale yazarı (varsa).
      // Article tipinde authorName geliyorsa creator'a koyamayız çünkü
      // yazar adı X handle'ı değil — fallback site handle'ı.
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      title,
      description: desc,
      images: image ? [image] : undefined,
    },
    ...(noIndex
      ? {
          robots: {
            index: false,
            follow: false,
            googleBot: { index: false, follow: false },
          },
        }
      : {}),
  };
}
