import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { slugify } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const artistId = searchParams.get('artistId');

  const where: Record<string, unknown> = {};
  if (artistId) where.artistId = artistId;

  const [items, total] = await Promise.all([
    prisma.album.findMany({ where, include: { artist: { select: { name: true, slug: true } }, _count: { select: { songs: true } } }, orderBy: { releaseDate: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.album.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error } = await requireSectionAccess('ALBUM', 'canCreate');
  if (error) return error;
  const body = await request.json();
  const { title, artistId, releaseDate, coverImage, descriptionTr, descriptionEn } = body;
  if (!title || !artistId) return NextResponse.json({ error: 'Title and artist are required' }, { status: 400 });
  const slug = slugify(title);
  const album = await prisma.album.create({ data: { slug, title, artistId, releaseDate: releaseDate ? new Date(releaseDate) : null, coverImage: coverImage || null, descriptionTr: descriptionTr || null, descriptionEn: descriptionEn || null } });
  return NextResponse.json(album, { status: 201 });
}
