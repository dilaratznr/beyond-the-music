export const revalidate = 30;

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';

/**
 * Prerender every architect at build time. New entries fall back to
 * on-demand ISR.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const architects: Array<{ slug: string }> = await prisma.architect.findMany({
    where: { status: 'PUBLISHED' },
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
  const architect = await prisma.architect.findFirst({
    where: { slug, status: 'PUBLISHED' },
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
  const tr = locale === 'tr';

  const architect = await prisma.architect.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      artists: {
        where: { artist: { status: 'PUBLISHED' } },
        include: {
          artist: {
            include: {
              genres: { where: { genre: { status: 'PUBLISHED' } }, include: { genre: true } },
            },
          },
        },
      },
    },
  });

  if (!architect) notFound();

  const bio = tr ? architect.bioTr : architect.bioEn;
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
    <div className="bg-[#0a0a0b] text-white">
      <JsonLd data={jsonLd} />

      {/* ▸▸▸ HERO — tür/sanatçı detayıyla aynı dil: full-bleed görsel,
          çift gradient, alt-hizalı eyebrow + Fraunces başlık + meta line. */}
      <section className="relative w-full min-h-[60vh] md:min-h-[70vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          {architect.image ? (
            <>
              <img src={architect.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-55" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b] via-black/60 to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-[#0a0a0b]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.08),transparent_55%)]" />
              <span
                className="absolute top-10 right-10 font-editorial font-black text-white/5 leading-none select-none"
                style={{ fontSize: 'clamp(8rem, 20vw, 20rem)' }}
                aria-hidden="true"
              >
                {architect.name.charAt(0)}
              </span>
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-black/40 to-black/10" />
        </div>

        <div className="relative z-10 w-full max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 pb-14 md:pb-20 pt-32">
          <nav aria-label="Breadcrumb" className="text-[11px] md:text-[12px] tracking-[0.3em] uppercase font-bold text-zinc-300 mb-7 flex items-center gap-3 flex-wrap">
            <span className="w-10 h-px bg-zinc-500" />
            <Link href={`/${locale}/architects`} className="text-zinc-400 hover:text-white underline-grow pb-1">{dict.architects.title}</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-white" aria-current="page">{architect.name}</span>
          </nav>

          <h1
            className="font-editorial leading-[0.95] tracking-[-0.025em] max-w-5xl"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 5.5rem)', fontWeight: 700 }}
          >
            {architect.name}
          </h1>

          <div className="mt-8 flex items-center gap-5 flex-wrap text-[13px] text-zinc-400 font-medium">
            <span className="px-3 py-1 bg-white/[0.06] border border-white/10 rounded-full text-[11px] font-bold uppercase tracking-widest text-white">
              {typeLabelMap[architect.type] || architect.type.replace('_', ' ')}
            </span>
            {architect.artists.length > 0 && (
              <>
                <span className="w-8 h-px bg-zinc-600" aria-hidden="true" />
                <span>{architect.artists.length} {tr ? 'çalıştığı sanatçı' : 'artists worked with'}</span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ▸▸▸ BODY — solda biyografi + bağlı sanatçılar; sağda sticky
          aside (ileride genişletilebilir). */}
      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 py-16 md:py-24 grid lg:grid-cols-12 gap-12 lg:gap-16">
        <div className="lg:col-span-8 space-y-16">
          {bio && (
            <section>
              <p className="text-zinc-500 text-[11px] tracking-[0.3em] uppercase font-bold mb-4">
                {tr ? 'Biyografi' : 'Biography'}
              </p>
              <div className="article-body max-w-none whitespace-pre-line">
                {bio}
              </div>
            </section>
          )}

          {architect.artists.length > 0 && (
            <section aria-labelledby="architect-artists">
              <p id="architect-artists" className="text-zinc-500 text-[11px] tracking-[0.3em] uppercase font-bold mb-6">
                {dict.architects.associatedArtists}
              </p>
              <div className="border-t border-white/10">
                {architect.artists.map(({ artist, role }) => (
                  <Link
                    key={artist.id}
                    href={`/${locale}/artist/${artist.slug}`}
                    className="group flex gap-5 py-5 border-b border-white/10 hover:bg-white/[0.02] transition-colors -mx-4 px-4 rounded-sm"
                  >
                    <div className="w-14 h-14 md:w-16 md:h-16 flex-shrink-0 rounded-full overflow-hidden relative bg-zinc-900">
                      {artist.image ? (
                        <img src={artist.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center font-editorial font-black text-white/15 text-2xl">
                          {artist.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="font-editorial text-lg md:text-xl font-semibold tracking-[-0.01em] group-hover:underline decoration-1 underline-offset-4">
                        {artist.name}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                        {role && <span>{role}</span>}
                        {role && artist.genres.length > 0 && <span className="w-3 h-px bg-zinc-700" aria-hidden="true" />}
                        <span>
                          {artist.genres.map((g) => (tr ? g.genre.nameTr : g.genre.nameEn)).join(' · ')}
                        </span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-24 lg:self-start">
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
            <p className="text-zinc-500 text-[11px] tracking-[0.3em] uppercase font-bold mb-3">
              {tr ? 'Hakkında' : 'Profile'}
            </p>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-zinc-500">{tr ? 'Tür' : 'Type'}</dt>
                <dd className="text-white font-medium">
                  {typeLabelMap[architect.type] || architect.type.replace('_', ' ')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">{tr ? 'Sanatçı' : 'Artists'}</dt>
                <dd className="text-white font-medium">{architect.artists.length}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
