import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';

/**
 * GET /api/settings — admin tarafı tüm SiteSetting anahtarlarını okur.
 *
 * GÜVENLİK: anonim erişime kapalı. Yalnızca admin oturumu (EDITOR+).
 * Public site bu endpoint'i KULLANMIYOR — `src/lib/site-contact.ts`,
 * `src/lib/site-branding.ts`, `src/lib/site-sections.ts`, `site-fonts.ts`,
 * `site-custom-nav.ts` server-side helper'ları doğrudan Prisma'dan
 * okuyup yalnızca gereken alt kümeyi render'a veriyor. Bu yüzden tüm
 * key/value'ları toplu döken bir public endpoint'e ihtiyaç yok.
 *
 * Rolü EDITOR'a indirmek `/admin/hero-videos` (poster URL'i okur) ve
 * `/admin/settings` (any-role view, SUPER_ADMIN-only save) sayfalarının
 * çalışmaya devam etmesi için yeterli.
 */
export async function GET() {
  const { error } = await requireAuth('EDITOR');
  if (error) return error;

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

  revalidateTag(CACHE_TAGS.settings, 'max');
  return NextResponse.json({ success: true });
}
