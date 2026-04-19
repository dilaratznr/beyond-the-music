import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { slugify } from '@/lib/utils';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const genre = await prisma.genre.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, nameTr: true, nameEn: true, slug: true } },
      children: true,
      _count: { select: { artists: true, articles: true } },
    },
  });
  if (!genre) return NextResponse.json({ error: 'Genre not found' }, { status: 404 });
  return NextResponse.json(genre);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('GENRE', 'canEdit');
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { nameTr, nameEn, descriptionTr, descriptionEn, image, parentId, order } = body;

  const data: Record<string, unknown> = {};
  if (nameTr !== undefined) data.nameTr = nameTr;
  if (nameEn !== undefined) {
    data.nameEn = nameEn;
    data.slug = slugify(nameEn);
  }
  if (descriptionTr !== undefined) data.descriptionTr = descriptionTr || null;
  if (descriptionEn !== undefined) data.descriptionEn = descriptionEn || null;
  if (image !== undefined) data.image = image || null;
  if (parentId !== undefined) {
    // Prevent a genre from being its own parent
    if (parentId === id) {
      return NextResponse.json({ error: 'A genre cannot be its own parent' }, { status: 400 });
    }
    data.parentId = parentId || null;
  }
  if (order !== undefined) data.order = order;

  const genre = await prisma.genre.update({ where: { id }, data });
  return NextResponse.json(genre);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('GENRE', 'canDelete');
  if (error) return error;

  const { id } = await params;

  // Prevent deletion if it has children or linked content
  const [childCount, articleCount, artistCount] = await Promise.all([
    prisma.genre.count({ where: { parentId: id } }),
    prisma.article.count({ where: { relatedGenreId: id } }),
    prisma.artistGenre.count({ where: { genreId: id } }),
  ]);

  if (childCount + articleCount + artistCount > 0) {
    return NextResponse.json(
      {
        error: 'Genre in use',
        details: { children: childCount, articles: articleCount, artists: artistCount },
      },
      { status: 409 }
    );
  }

  await prisma.genre.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
