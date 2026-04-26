import prisma from './prisma';

export const ALL_SECTIONS = [
  'GENRE', 'ARTIST', 'ALBUM', 'ARCHITECT', 'ARTICLE',
  'LISTENING_PATH', 'MEDIA', 'THEORY', 'AI_MUSIC',
] as const;

export type Section = typeof ALL_SECTIONS[number];

export const SECTION_LABELS: Record<string, { tr: string; en: string; icon: string }> = {
  GENRE: { tr: 'Türler', en: 'Genres', icon: '♫' },
  ARTIST: { tr: 'Sanatçılar', en: 'Artists', icon: '♪' },
  ALBUM: { tr: 'Albümler', en: 'Albums', icon: '◉' },
  ARCHITECT: { tr: 'Mimarlar', en: 'Architects', icon: '⚙' },
  ARTICLE: { tr: 'Makaleler', en: 'Articles', icon: '✎' },
  LISTENING_PATH: { tr: 'Dinleme Rotaları', en: 'Listening Paths', icon: '⟡' },
  MEDIA: { tr: 'Medya', en: 'Media', icon: '⬡' },
  THEORY: { tr: 'Teori', en: 'Theory', icon: '♭' },
  AI_MUSIC: { tr: 'AI Müzik', en: 'AI Music', icon: '⚡' },
};

export async function getUserPermissions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { permissions: true },
  });

  if (!user) return null;

  // Super admin has all permissions
  if (user.role === 'SUPER_ADMIN') {
    return {
      user,
      isSuperAdmin: true,
      sections: ALL_SECTIONS.reduce((acc, s) => {
        acc[s] = { canCreate: true, canEdit: true, canDelete: true, canPublish: true };
        return acc;
      }, {} as Record<string, { canCreate: boolean; canEdit: boolean; canDelete: boolean; canPublish: boolean }>),
    };
  }

  const sections: Record<string, { canCreate: boolean; canEdit: boolean; canDelete: boolean; canPublish: boolean }> = {};
  for (const perm of user.permissions) {
    sections[perm.section] = {
      canCreate: perm.canCreate,
      canEdit: perm.canEdit,
      canDelete: perm.canDelete,
      canPublish: perm.canPublish,
    };
  }

  return { user, isSuperAdmin: false, sections };
}

export function hasPermission(
  sections: Record<string, { canCreate: boolean; canEdit: boolean; canDelete: boolean; canPublish: boolean }>,
  section: string,
  action: 'canCreate' | 'canEdit' | 'canDelete' | 'canPublish'
): boolean {
  return sections[section]?.[action] ?? false;
}

export function canAccessSection(
  sections: Record<string, { canCreate: boolean; canEdit: boolean; canDelete: boolean; canPublish: boolean }>,
  section: string,
): boolean {
  const perm = sections[section];
  if (!perm) return false;
  return perm.canCreate || perm.canEdit || perm.canDelete || perm.canPublish;
}

/**
 * API'den gelen permissions array'ini sertleştir:
 *   - section ALL_SECTIONS whitelist'inde olmalı (typo / custom string DB'ye yazılmasın)
 *   - aynı section iki kez gönderilmişse en son geçerli olur (UI bug toleransı)
 *   - canCreate/canEdit/canDelete/canPublish strict boolean'a coerce edilir
 *     (truthy "yes"/"1" gibi sürpriz değerler false'a düşer)
 *
 * Geçersiz girişte `{ ok: false, error }` döner; caller 400'le dönmeli.
 * Boş array veya undefined → ok=true, sanitized=[].
 */
export interface IncomingPermission {
  section: string;
  canCreate?: unknown;
  canEdit?: unknown;
  canDelete?: unknown;
  canPublish?: unknown;
}

export interface SanitizedPermission {
  section: Section;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
}

export function sanitizePermissionsInput(
  raw: unknown,
):
  | { ok: true; sanitized: SanitizedPermission[] }
  | { ok: false; error: string } {
  if (raw === undefined || raw === null) {
    return { ok: true, sanitized: [] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'permissions bir dizi olmalı' };
  }

  const validSections = new Set<string>(ALL_SECTIONS);
  const bySection = new Map<Section, SanitizedPermission>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'permissions girdileri obje olmalı' };
    }
    const p = item as IncomingPermission;
    if (typeof p.section !== 'string' || !validSections.has(p.section)) {
      return {
        ok: false,
        error: `Geçersiz section: ${String(p.section)}. İzin verilenler: ${ALL_SECTIONS.join(', ')}`,
      };
    }
    bySection.set(p.section as Section, {
      section: p.section as Section,
      // === true ile strict coerce — "true" string'i, 1, "yes" gibi
      // truthy ama beklenmeyen değerler false'a düşer.
      canCreate: p.canCreate === true,
      canEdit: p.canEdit === true,
      canDelete: p.canDelete === true,
      canPublish: p.canPublish === true,
    });
  }

  return { ok: true, sanitized: Array.from(bySection.values()) };
}
