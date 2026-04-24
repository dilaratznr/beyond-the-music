import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';
import { resolveEditStatus } from '@/lib/content-review';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = await prisma.listeningPath.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { order: 'asc' },
        include: {
          song: { select: { id: true, title: true, album: { select: { title: true, slug: true } } } },
          album: { select: { id: true, title: true, slug: true } },
          artist: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });
  if (!path) return NextResponse.json({ error: 'Listening path not found' }, { status: 404 });
  return NextResponse.json(path);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireSectionAccess('LISTENING_PATH', 'canEdit');
  if (error || !user) return error;

  const { id } = await params;
  const body = await request.json();
  const { titleTr, titleEn, descriptionTr, descriptionEn, type, image } = body;

  const existing = await prisma.listeningPath.findUnique({
    where: { id },
    select: { titleTr: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: 'Listening path not found' }, { status: 404 });

  const { status: nextStatus, requiresReview } = await resolveEditStatus({
    section: 'LISTENING_PATH',
    userId: user.id,
    entityId: id,
    entityTitle: titleTr ?? existing.titleTr,
    currentStatus: existing.status as 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED',
  });

  const data: Record<string, unknown> = { status: nextStatus };
  if (titleTr !== undefined) data.titleTr = titleTr;
  if (titleEn !== undefined) {
    data.titleEn = titleEn;
    data.slug = slugify(titleEn);
  }
  if (descriptionTr !== undefined) data.descriptionTr = descriptionTr || null;
  if (descriptionEn !== undefined) data.descriptionEn = descriptionEn || null;
  if (type !== undefined) data.type = type;
  if (image !== undefined) data.image = image || null;

  const path = await prisma.listeningPath.update({ where: { id }, data });
  revalidateTag(CACHE_TAGS.listeningPath, 'max');
  return NextResponse.json({ ...path, requiresReview });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('LISTENING_PATH', 'canDelete');
  if (error) return error;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  // Path silindiğinde ListeningPathItem'lar cascade ile kaybolur.
  const itemCount = await prisma.listeningPathItem.count({ where: { pathId: id } });

  if (!force && itemCount > 0) {
    return NextResponse.json(
      {
        error: 'Path has items',
        requiresConfirmation: true,
        impact: { items: itemCount },
        message: `Bu rotada ${itemCount} öğe var. Rota silindiğinde öğeler de kaybolur.`,
      },
      { status: 409 },
    );
  }

  await prisma.listeningPath.delete({ where: { id } });
  revalidateTag(CACHE_TAGS.listeningPath, 'max');
  return NextResponse.json({ success: true });
}
