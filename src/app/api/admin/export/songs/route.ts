import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { buildCsv } from '@/lib/csv';

/**
 * GET /api/admin/export/songs[?albumId=...&isDeepCut=true]
 *
 * Flat song-level export, scoped by the same filters the songs list
 * page uses, so what you see is what you get when you click "CSV
 * indir" on a filtered view.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAuth('EDITOR');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const albumId = searchParams.get('albumId') || undefined;
  const deepCutOnly = searchParams.get('isDeepCut') === 'true';

  const songs = await prisma.song.findMany({
    where: {
      ...(albumId ? { albumId } : {}),
      ...(deepCutOnly ? { isDeepCut: true } : {}),
    },
    include: {
      album: {
        select: {
          title: true,
          artist: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { album: { artist: { name: 'asc' } } },
      { album: { title: 'asc' } },
      { trackNumber: 'asc' },
      { title: 'asc' },
    ],
  });

  const header = [
    'artist',
    'album_title',
    'track_number',
    'song_title',
    'duration',
    'is_deep_cut',
    'spotify_url',
    'youtube_url',
  ];

  const rows: (string | number | null)[][] = [header];
  for (const s of songs) {
    rows.push([
      s.album?.artist?.name ?? '',
      s.album?.title ?? '',
      s.trackNumber,
      s.title,
      s.duration,
      s.isDeepCut ? 'true' : 'false',
      s.spotifyUrl,
      s.youtubeUrl,
    ]);
  }

  const csv = buildCsv(rows);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sarkilar.csv"',
    },
  });
}
