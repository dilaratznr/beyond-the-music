import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { slugify } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const [items, total] = await Promise.all([
    prisma.listeningPath.findMany({ include: { _count: { select: { items: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.listeningPath.count(),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error } = await requireSectionAccess('LISTENING_PATH', 'canCreate');
  if (error) return error;
  const body = await request.json();
  const { titleTr, titleEn, descriptionTr, descriptionEn, type, image } = body;
  if (!titleTr || !titleEn || !type) return NextResponse.json({ error: 'Title (TR/EN) and type are required' }, { status: 400 });
  const slug = slugify(titleEn);
  const path = await prisma.listeningPath.create({ data: { slug, titleTr, titleEn, descriptionTr: descriptionTr || null, descriptionEn: descriptionEn || null, type, image: image || null } });
  return NextResponse.json(path, { status: 201 });
}
