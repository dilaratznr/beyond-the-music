/**
 * Public şarkı keşif sayfası — admin panelindeki Song listesinin public
 * karşılığı. PUBLISHED albümlerin altındaki tüm şarkılar burada listelenir;
 * her satır kendi Spotify/YouTube player'ı + hikayesi ile expand olur
 * (AlbumTrackList component'i reuse edilir).
 *
 * Filtreleme client-side (SongExplorer): arama + Deep Cut toggle + sanatçı
 * dropdown'u. Veri seti küçük olduğu sürece (binlerce şarkıya kadar) tek
 * fetch + JS filtre yeterli.
 */
export const revalidate = 30;

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getDictionary } from '@/i18n';
import { isSectionEnabled } from '@/lib/site-sections';
import { buildPageMetadata } from '@/lib/seo';
import PageHero from '@/components/public/PageHero';
import EmptyState from '@/components/public/EmptyState';
import SongExplorer from '@/components/public/SongExplorer';

async function loadSongs() {
  return prisma.song.findMany({
    where: {
      // Albümü yayında olan şarkılar — DRAFT/PENDING albümlerin track'ları
      // public listeye sızmasın.
      album: { status: 'PUBLISHED' },
    },
    select: {
      id: true,
      title: true,
      trackNumber: true,
      duration: true,
      isDeepCut: true,
      spotifyUrl: true,
      youtubeUrl: true,
      descriptionTr: true,
      descriptionEn: true,
      album: {
        select: {
          title: true,
          slug: true,
          artist: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    orderBy: [
      // Önce öne çıkan albümler (admin elle sıraladı), sonra başlık alfabetik
      { album: { featuredOrder: { sort: 'asc', nulls: 'last' } } },
      { title: 'asc' },
    ],
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return buildPageMetadata({
    title: dict.song?.title ?? (locale === 'tr' ? 'Şarkılar' : 'Songs'),
    description: dict.song?.subtitle ?? null,
    locale,
    path: '/song',
  });
}

export default async function SongListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(await isSectionEnabled('song'))) notFound();
  const dict = getDictionary(locale);
  const tr = locale === 'tr';

  const songs = await loadSongs();

  return (
    <div className="bg-[#0a0a0b] text-white">
      <PageHero
        eyebrow={tr ? 'Katalog' : 'Catalogue'}
        title={dict.song?.title ?? (tr ? 'Şarkılar' : 'Songs')}
        subtitle={dict.song?.subtitle ?? ''}
        meta={
          <div className="text-[11px] uppercase tracking-wider text-white/40 font-bold">
            {songs.length}{' '}
            {dict.song?.title?.toLowerCase() ?? (tr ? 'şarkı' : 'songs')}
          </div>
        }
      />

      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 py-12 space-y-8">
        {songs.length === 0 ? (
          <EmptyState
            title={dict.song?.empty ?? (tr ? 'Henüz yayında şarkı yok.' : 'No songs published yet.')}
            hint={dict.song?.emptyHint ?? (tr ? 'Albümler eklendikçe burada listelenir' : 'Songs will appear here as albums are added')}
          />
        ) : (
          <SongExplorer
            songs={songs}
            locale={locale}
            labels={{
              deepCut: dict.artist.deepCuts,
              expand: tr ? 'Aç' : 'Open',
              collapse: tr ? 'Kapat' : 'Close',
              about: dict.song?.about ?? (tr ? 'Şarkı Hakkında' : 'About this song'),
              listenOnSpotify: dict.song?.listenOnSpotify ?? 'Spotify',
              listenOnYouTube: dict.song?.listenOnYouTube ?? 'YouTube',
              openAlbum: dict.song?.openAlbum ?? (tr ? 'Albümü Aç' : 'Open album'),
              searchPlaceholder: dict.song?.searchPlaceholder ?? (tr ? 'Şarkı ara…' : 'Search songs…'),
              deepCutsOnly: dict.song?.deepCutsOnly ?? (tr ? 'Sadece Deep Cuts' : 'Deep Cuts only'),
              allArtists: dict.song?.allArtists ?? (tr ? 'Tüm Sanatçılar' : 'All Artists'),
              noResults: dict.song?.noResults ?? (tr ? 'Aramana uygun şarkı bulunamadı' : 'No songs match your search'),
            }}
          />
        )}
      </div>
    </div>
  );
}
