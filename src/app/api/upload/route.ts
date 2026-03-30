import { NextRequest, NextResponse } from 'next/server';
import { requireSectionAccess } from '@/lib/auth-guard';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  const { error } = await requireSectionAccess('MEDIA', 'canCreate');
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const category = (formData.get('category') as string) || 'other';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Allowed: JPG, PNG, WebP, GIF' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum 5MB' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split('.').pop();
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  const url = `/uploads/${filename}`;

  // Save to DB
  await prisma.mediaItem.create({
    data: {
      url,
      type: 'IMAGE',
      entityType: category,
      entityId: '',
    },
  });

  return NextResponse.json({ url, category });
}

export async function GET() {
  const items = await prisma.mediaItem.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json(items);
}
