import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { validateSettingsPayload } from '@/lib/site-settings-schema';

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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Allowlist + per-field validation. Bilinmeyen key, geçersiz URL,
  // `javascript:` protokolü, kötü JSON, sınır aşımı — hepsi burada
  // yakalanır. Tek bir geçersiz alan tüm batch'i reddetmek yerine,
  // kabul edilenleri yazıp reddedilenleri response'da listeliyoruz —
  // admin UI hangi alanın neden reddedildiğini gösterebilsin diye.
  const { accepted, rejected } = validateSettingsPayload(body);

  // Hepsi reddedildiyse hiç DB'ye yazma + 400 dön. Aksi halde "yazıldı"
  // diyen 200 ama gerçekte hiçbir şey değişmemiş hayal kırıklığı olurdu.
  if (accepted.length === 0 && rejected.length > 0) {
    return NextResponse.json(
      { error: 'Geçerli alan yok', rejected },
      { status: 400 },
    );
  }

  // Tek transaction'da yaz — tek tek upsert'lerin yarısı geçip yarısı
  // network hatasıyla düşse SiteSetting tutarsız kalırdı.
  await prisma.$transaction(
    accepted.map((field) =>
      prisma.siteSetting.upsert({
        where: { key: field.key },
        update: { value: field.value },
        create: { key: field.key, value: field.value },
      }),
    ),
  );

  revalidateTag(CACHE_TAGS.settings, 'max');
  return NextResponse.json({
    success: true,
    written: accepted.length,
    rejected: rejected.length > 0 ? rejected : undefined,
  });
}
