import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { audit, extractContext } from '@/lib/audit-log';

export async function GET() {
  const videos = await prisma.heroVideo.findMany({ orderBy: { order: 'asc' } });
  return NextResponse.json(videos);
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth('SUPER_ADMIN');
  if (error || !user) return error;

  const body = await request.json();
  const { url, duration, title } = body;

  if (!url) return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });

  const count = await prisma.heroVideo.count();

  const video = await prisma.heroVideo.create({
    data: { url, duration: duration || 10, order: count, isActive: true, title: title || null },
  });

  const ctx = extractContext(request);
  await audit({
    event: 'HERO_VIDEO_CREATED',
    actorId: user.id,
    targetId: video.id,
    targetType: 'HERO_VIDEO',
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    detail: video.title || video.url,
  });

  return NextResponse.json(video, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAuth('SUPER_ADMIN');
  if (error) return error;

  const body = await request.json();
  const { id, url, duration, order, isActive, title } = body;

  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const video = await prisma.heroVideo.update({
    where: { id },
    data: {
      ...(url !== undefined && { url }),
      ...(duration !== undefined && { duration }),
      ...(order !== undefined && { order }),
      ...(isActive !== undefined && { isActive }),
      ...(title !== undefined && { title }),
    },
  });

  return NextResponse.json(video);
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAuth('SUPER_ADMIN');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  await prisma.heroVideo.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
