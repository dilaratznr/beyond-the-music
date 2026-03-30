import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const settings = await prisma.siteSetting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return NextResponse.json(map);
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAuth('SUPER_ADMIN');
  if (error) return error;

  const body = await request.json();

  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== 'string') continue;
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  return NextResponse.json({ success: true });
}
