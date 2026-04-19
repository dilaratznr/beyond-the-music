import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { buildCsv } from '@/lib/csv';

/**
 * GET /api/admin/export/albums[?artistId=...]
 *
 * Exports the album roster as a CSV matching the shape the
 * discography import expects. When artistId is supplied we scope the
 * export to a single artist (handy for editing + re-importing their
 * catalog).
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAuth('EDITOR');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get('artistId') || undefined;

  const albums = await prisma.album.findMany({
    where: artistId ? { artistId } : undefined,
    include: {
      artist: { select: { name: true } },
      songs: { orderBy: [{ trackNumber: 'asc' }, { title: 'asc' }] },
    },
    orderBy: [{ artist: { name: 'asc' } }, { releaseDate: 'asc' }, { title: 'asc' }],
  });

  const header = [
    'artist',
    'album_title',
    'album_year',
    'album_cover',
    'track_number',
    'song_title',
    'duration',
    'is_deep_cut',
    'spotify_url',
    'youtube_url',
  ];

  const rows: (string | number | null)[][] = [header];
  for (const a of albums) {
    const year = a.releaseDate ? new Date(a.releaseDate).getUTCFullYear() : null;
    if (a.songs.length === 0) {
      // Album-only row so the artist still sees it in the export.
      rows.push([a.artist.name, a.title, year, a.coverImage, null, null, null, null, null, null]);
      continue;
    }
    for (const s of a.songs) {
      rows.push([
        a.artist.name,
        a.title,
        year,
        a.coverImage,
        s.trackNumber,
        s.title,
        s.duration,
        s.isDeepCut ? 'true' : 'false',
        s.spotifyUrl,
        s.youtubeUrl,
      ]);
    }
  }

  const csv = buildCsv(rows);
  const filename = artistId ? `diskografi-${artistId}.csv` : 'albumler.csv';
  return new NextResponse(csv, {
    headers: {
      // Include BOM so Excel opens UTF-8 correctly.
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
