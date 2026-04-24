import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';
import { resolveEditStatus } from '@/lib/content-review';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const architect = await prisma.architect.findUnique({
    where: { id },
    include: {
      artists: { include: { artist: { select: { id: true, name: true, slug: true } } } },
    },
  });
  if (!architect) return NextResponse.json({ error: 'Architect not found' }, { status: 404 });
  return NextResponse.json(architect);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireSectionAccess('ARCHITECT', 'canEdit');
  if (error || !user) return error;

  const { id } = await params;
  const body = await request.json();
  const { name, type, bioTr, bioEn, image } = body;

  const existing = await prisma.architect.findUnique({
    where: { id },
    select: { name: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: 'Architect not found' }, { status: 404 });

  const { status: nextStatus, requiresReview } = await resolveEditStatus({
    section: 'ARCHITECT',
    userId: user.id,
    entityId: id,
    entityTitle: name ?? existing.name,
    currentStatus: existing.status as 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED',
  });

  const data: Record<string, unknown> = { status: nextStatus };
  if (name !== undefined) {
    data.name = name;
    data.slug = slugify(name);
  }
  if (type !== undefined) data.type = type;
  if (bioTr !== undefined) data.bioTr = bioTr || null;
  if (bioEn !== undefined) data.bioEn = bioEn || null;
  if (image !== undefined) data.image = image || null;

  const architect = await prisma.architect.update({ where: { id }, data });
  revalidateTag(CACHE_TAGS.architect, 'max');
  return NextResponse.json({ ...architect, requiresReview });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('ARCHITECT', 'canDelete');
  if (error) return error;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  // Architect silindiğinde ArchitectArtist pivot tablosu cascade ile gider
  // — sanatçılar kalır ama bu mimarla bağlantıları kopar. Kullanıcıya
  // etkiyi gösterelim.
  const linkedArtists = await prisma.architectArtist.count({
    where: { architectId: id },
  });

  if (!force && linkedArtists > 0) {
    return NextResponse.json(
      {
        error: 'Architect in use',
        requiresConfirmation: true,
        impact: { artists: linkedArtists },
        message: `Bu mimar ${linkedArtists} sanatçıyla bağlantılı. Silinirse bağlantılar kopar (sanatçılar kalır).`,
      },
      { status: 409 },
    );
  }

  await prisma.architect.delete({ where: { id } });
  revalidateTag(CACHE_TAGS.architect, 'max');
  return NextResponse.json({ success: true });
}
