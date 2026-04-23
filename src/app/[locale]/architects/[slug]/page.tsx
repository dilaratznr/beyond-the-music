export const revalidate = 30;

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';

/**
 * Prerender every architect at build time. New entries fall back to
 * on-demand ISR.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const architects: Array<{ slug: string }> = await prisma.architect.findMany({
    select: { slug: true },
  });
  return architects.map(({ slug }) => ({ slug }));
}
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/i18n';
import { buildPageMetadata, stripHtml, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { isSectionEnabled } from '@/lib/site-sections';

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const architect = await prisma.architect.findUnique({
    where: { slug },
    select: { name: true, bioTr: true, bioEn: true, image: true },
  });
  if (!architect) {
    return { title: locale === 'tr' ? 'Mimar bulunamadı' : 'Architect not found' };
  }
  return buildPageMetadata({
    title: architect.name,
    description: stripHtml(
      locale === 'tr' ? architect.bioTr : architect.bioEn,
    ),
    locale,
    path: `/architects/${slug}`,
    image: architect.image,
    type: 'profile',
  });
}

export default async function ArchitectDetailPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!(await isSectionEnabled('architects'))) notFound();
  const dict = getDictionary(locale);

  const architect = await prisma.architect.findUnique({
    where: { slug },
    include: { artists: { include: { artist: true } } },
  });

  if (!architect) notFound();

  const bio = locale === 'tr' ? architect.bioTr : architect.bioEn;
  const typeLabelMap: Record<string, string> = {
    PRODUCER: dict.architects.producer,
    STUDIO: dict.architects.studio,
    MANAGER: dict.architects.manager,
    ARRANGER: dict.architects.arrangers,
    RECORD_LABEL: dict.architects.recordLabels,
  };

  const schemaType =
    architect.type === 'STUDIO' || architect.type === 'RECORD_LABEL'
      ? 'Organization'
      : 'Person';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: architect.name,
    description: stripHtml(bio),
    image: architect.image || undefined,
    url: `${SITE_URL}/${locale}/architects/${slug}`,
    jobTitle:
      schemaType === 'Person'
        ? typeLabelMap[architect.type] || architect.type.replace('_', ' ')
        : undefined,
    ...(architect.artists.length > 0
      ? {
          knowsAbout: architect.artists.map(({ artist }) => artist.name),
        }
      : {}),
  };

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen pt-20">
    <JsonLd data={jsonLd} />
    <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-zinc-500 mb-4">
        <Link href={`/${locale}/architects`} className="hover:text-white">{dict.architects.title}</Link>
        <span className="mx-1">/</span>
        <span className="text-white font-medium" aria-current="page">{architect.name}</span>
      </nav>

      <div className="grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{architect.name}</h1>
          <span className="px-3 py-1 bg-zinc-800 rounded-full text-sm mb-6 inline-block">
            {typeLabelMap[architect.type] || architect.type.replace('_', ' ')}
          </span>
          {bio && <div className="prose prose-zinc max-w-none mt-6"><p className="whitespace-pre-line">{bio}</p></div>}

          {architect.artists.length > 0 && (
            <section className="mt-10" aria-labelledby="architect-artists">
              <h2 id="architect-artists" className="text-xl font-bold mb-4">{dict.architects.associatedArtists}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {architect.artists.map(({ artist, role }) => (
                  <Link key={artist.id} href={`/${locale}/artist/${artist.slug}`}
                    className="p-4 bg-zinc-900 rounded-xl hover:shadow-md transition-shadow">
                    <p className="font-semibold">{artist.name}</p>
                    {role && <p className="text-xs text-zinc-500 mt-1">{role}</p>}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside>
          {architect.image && <img src={architect.image} alt={architect.name} className="w-full rounded-xl" />}
        </aside>
      </div>
    </div>
    </div>
  );
}
