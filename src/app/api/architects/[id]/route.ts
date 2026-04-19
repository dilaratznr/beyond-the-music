import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { slugify } from '@/lib/utils';

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
  const { error } = await requireSectionAccess('ARCHITECT', 'canEdit');
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { name, type, bioTr, bioEn, image } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) {
    data.name = name;
    data.slug = slugify(name);
  }
  if (type !== undefined) data.type = type;
  if (bioTr !== undefined) data.bioTr = bioTr || null;
  if (bioEn !== undefined) data.bioEn = bioEn || null;
  if (image !== undefined) data.image = image || null;

  const architect = await prisma.architect.update({ where: { id }, data });
  return NextResponse.json(architect);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('ARCHITECT', 'canDelete');
  if (error) return error;

  const { id } = await params;
  await prisma.architect.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
