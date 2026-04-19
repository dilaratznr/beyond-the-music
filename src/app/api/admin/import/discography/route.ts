import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { slugify } from '@/lib/utils';
import { parseCsv, rowsToRecords, parseBool, parseReleaseDate, parseTrackNumber } from '@/lib/csv';

/**
 * POST /api/admin/import/discography
 * Body: { artistId: string, csv: string, dryRun?: boolean }
 *
 * Parses a CSV of the shape:
 *   album_title, album_year, album_cover, track_number, song_title,
 *   duration, is_deep_cut, spotify_url, youtube_url
 * …and creates every missing album + song for the given artist in a
 * single transaction. Re-importing the same CSV is safe: albums are
 * matched by (artistId, slug), songs by (albumId, title).
 *
 * dryRun=true validates + returns the plan without writing; the admin
 * UI uses this to render a preview step before the user commits.
 *
 * Required columns: album_title. Everything else is optional. A row
 * with an empty song_title produces an "album-only" entry — useful
 * when the artist has a release you want to register without the
 * track list yet.
 */
type PlanAction = 'create' | 'update' | 'skip';
interface SongPlan {
  action: PlanAction;
  title: string;
  trackNumber: number | null;
  duration: string | null;
  isDeepCut: boolean;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
}
interface AlbumPlan {
  action: PlanAction;
  title: string;
  slug: string;
  releaseDate: Date | null;
  coverImage: string | null;
  songs: SongPlan[];
}

export async function POST(request: NextRequest) {
  const { error } = await requireSectionAccess('ALBUM', 'canCreate');
  if (error) return error;

  const body = await request.json().catch(() => null);
  const artistId = typeof body?.artistId === 'string' ? body.artistId : '';
  const csv = typeof body?.csv === 'string' ? body.csv : '';
  const dryRun = Boolean(body?.dryRun);

  if (!artistId || !csv.trim()) {
    return NextResponse.json(
      { error: 'artistId ve csv alanları zorunlu.' },
      { status: 400 },
    );
  }

  const artist = await prisma.artist.findUnique({ where: { id: artistId } });
  if (!artist) {
    return NextResponse.json({ error: 'Sanatçı bulunamadı.' }, { status: 404 });
  }

  const rows = parseCsv(csv);
  const records = rowsToRecords(rows);
  if (records.length === 0) {
    return NextResponse.json(
      { error: 'CSV boş görünüyor veya başlık satırı dışında satır yok.' },
      { status: 400 },
    );
  }

  // Validate headers up-front. We accept either lower_snake or bare
  // (case-insensitive) header cells so that copy-paste from a
  // spreadsheet doesn't force a specific capitalization.
  const firstRecord = records[0];
  const keys = Object.keys(firstRecord).map((k) => k.toLowerCase());
  const hasAlbumTitle = keys.some((k) => k === 'album_title' || k === 'album' || k === 'albüm');
  if (!hasAlbumTitle) {
    return NextResponse.json(
      { error: 'CSV başlık satırında `album_title` sütunu bulunamadı.' },
      { status: 400 },
    );
  }

  // Normalise record keys to the canonical lowercase snake_case schema
  // so the downstream logic doesn't have to care about input style.
  const norm = records.map((rec) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(rec)) {
      const key = k.toLowerCase().trim();
      // Map a couple of common aliases → canonical.
      const canonical =
        key === 'album' || key === 'albüm' ? 'album_title'
        : key === 'year' ? 'album_year'
        : key === 'cover' ? 'album_cover'
        : key === 'track' ? 'track_number'
        : key === 'song' || key === 'title' || key === 'şarkı' ? 'song_title'
        : key === 'deep_cut' || key === 'deepcut' ? 'is_deep_cut'
        : key === 'spotify' ? 'spotify_url'
        : key === 'youtube' ? 'youtube_url'
        : key;
      out[canonical] = v;
    }
    return out;
  });

  // Group rows by album title → plan per album.
  const existingAlbums = await prisma.album.findMany({
    where: { artistId },
    include: { songs: true },
  });
  const existingAlbumBySlug = new Map(existingAlbums.map((a) => [a.slug, a]));

  const plansByAlbumSlug = new Map<string, AlbumPlan>();
  const errors: { row: number; message: string }[] = [];

  norm.forEach((rec, i) => {
    const rowNum = i + 2; // +1 for header, +1 for 1-based display
    const albumTitle = (rec.album_title ?? '').trim();
    if (!albumTitle) {
      errors.push({ row: rowNum, message: 'album_title boş.' });
      return;
    }
    const albumSlug = slugify(albumTitle);
    if (!albumSlug) {
      errors.push({ row: rowNum, message: `album_title "${albumTitle}" geçerli bir slug üretmedi.` });
      return;
    }

    let plan = plansByAlbumSlug.get(albumSlug);
    if (!plan) {
      const existing = existingAlbumBySlug.get(albumSlug);
      plan = {
        action: existing ? 'update' : 'create',
        title: albumTitle,
        slug: albumSlug,
        releaseDate: parseReleaseDate(rec.album_year),
        coverImage: rec.album_cover?.trim() || null,
        songs: [],
      };
      plansByAlbumSlug.set(albumSlug, plan);
    }

    const songTitle = (rec.song_title ?? '').trim();
    if (!songTitle) return; // album-only row

    const existing = existingAlbumBySlug.get(albumSlug);
    const songExists = existing?.songs.some(
      (s) => s.title.toLowerCase() === songTitle.toLowerCase(),
    );

    plan.songs.push({
      action: songExists ? 'skip' : 'create',
      title: songTitle,
      trackNumber: parseTrackNumber(rec.track_number),
      duration: rec.duration?.trim() || null,
      isDeepCut: parseBool(rec.is_deep_cut),
      spotifyUrl: rec.spotify_url?.trim() || null,
      youtubeUrl: rec.youtube_url?.trim() || null,
    });
  });

  if (errors.length > 0) {
    return NextResponse.json({ error: 'CSV hataları', details: errors }, { status: 400 });
  }

  const plan = Array.from(plansByAlbumSlug.values());

  const summary = {
    albumsToCreate: plan.filter((p) => p.action === 'create').length,
    albumsToUpdate: plan.filter((p) => p.action === 'update').length,
    songsToCreate: plan.reduce(
      (n, p) => n + p.songs.filter((s) => s.action === 'create').length,
      0,
    ),
    songsToSkip: plan.reduce(
      (n, p) => n + p.songs.filter((s) => s.action === 'skip').length,
      0,
    ),
  };

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      artist: { id: artist.id, name: artist.name },
      plan: plan.map((p) => ({
        action: p.action,
        title: p.title,
        slug: p.slug,
        releaseDate: p.releaseDate?.toISOString() ?? null,
        coverImage: p.coverImage,
        songs: p.songs,
      })),
      summary,
    });
  }

  // Commit: a single transaction so a mid-run error rolls back cleanly.
  const writes = [] as Array<ReturnType<typeof prisma.album.create>
    | ReturnType<typeof prisma.album.update>
    | ReturnType<typeof prisma.song.create>>;

  for (const p of plan) {
    const existing = existingAlbumBySlug.get(p.slug);
    if (!existing) {
      writes.push(
        prisma.album.create({
          data: {
            title: p.title,
            slug: p.slug,
            artistId,
            releaseDate: p.releaseDate,
            coverImage: p.coverImage,
          },
        }),
      );
    }
    // For update we only fill blanks so we don't clobber manual edits.
    else if (p.action === 'update') {
      const patch: Record<string, unknown> = {};
      if (!existing.releaseDate && p.releaseDate) patch.releaseDate = p.releaseDate;
      if (!existing.coverImage && p.coverImage) patch.coverImage = p.coverImage;
      if (Object.keys(patch).length > 0) {
        writes.push(prisma.album.update({ where: { id: existing.id }, data: patch }));
      }
    }
  }

  // Two-phase: create albums first (so we can look up their IDs), then
  // create songs. Prisma doesn't let us atomically chain createMany +
  // dependent createMany, so we break it into one transaction after
  // we resolve album IDs.
  await prisma.$transaction(writes);

  // Re-fetch albums with songs so we have fresh IDs + know which songs
  // actually need inserting (guards against a second run where
  // existingAlbumBySlug was stale).
  const refreshed = await prisma.album.findMany({
    where: { artistId, slug: { in: plan.map((p) => p.slug) } },
    include: { songs: true },
  });
  const bySlug = new Map(refreshed.map((a) => [a.slug, a]));

  const songWrites = [] as ReturnType<typeof prisma.song.create>[];
  for (const p of plan) {
    const album = bySlug.get(p.slug);
    if (!album) continue;
    const existingTitles = new Set(album.songs.map((s) => s.title.toLowerCase()));
    for (const s of p.songs) {
      if (existingTitles.has(s.title.toLowerCase())) continue;
      songWrites.push(
        prisma.song.create({
          data: {
            albumId: album.id,
            title: s.title,
            trackNumber: s.trackNumber,
            duration: s.duration,
            isDeepCut: s.isDeepCut,
            spotifyUrl: s.spotifyUrl,
            youtubeUrl: s.youtubeUrl,
          },
        }),
      );
    }
  }
  if (songWrites.length > 0) {
    await prisma.$transaction(songWrites);
  }

  return NextResponse.json({
    success: true,
    artist: { id: artist.id, name: artist.name },
    summary,
  });
}
