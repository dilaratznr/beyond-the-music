/**
 * Shared constants for the super-admin user management pages.
 * Keeping these in one place prevents /admin/users/{new,[id]} from drifting
 * as new sections are added to the Prisma schema.
 */

export const PERMISSION_SECTIONS = [
  { key: 'GENRE', labelTr: 'Türler', labelEn: 'Genres', icon: '♫' },
  { key: 'ARTIST', labelTr: 'Sanatçılar', labelEn: 'Artists', icon: '♪' },
  { key: 'ALBUM', labelTr: 'Albümler', labelEn: 'Albums', icon: '◉' },
  { key: 'ARCHITECT', labelTr: 'Mimarlar', labelEn: 'Architects', icon: '⚙' },
  { key: 'ARTICLE', labelTr: 'Makaleler', labelEn: 'Articles', icon: '✎' },
  { key: 'LISTENING_PATH', labelTr: 'Dinleme Rotaları', labelEn: 'Listening Paths', icon: '⟡' },
  { key: 'MEDIA', labelTr: 'Medya', labelEn: 'Media', icon: '⬡' },
  { key: 'THEORY', labelTr: 'Teori', labelEn: 'Theory', icon: '△' },
  { key: 'AI_MUSIC', labelTr: 'AI Müzik', labelEn: 'AI Music', icon: '◇' },
] as const;

export type PermissionSectionKey = (typeof PERMISSION_SECTIONS)[number]['key'];
export const PERMISSION_ACTIONS = ['canCreate', 'canEdit', 'canDelete', 'canPublish'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const ROLE_INFO: Record<string, { labelTr: string; labelEn: string; descriptionTr: string; descriptionEn: string; accent: string }> = {
  SUPER_ADMIN: {
    labelTr: 'Süper Admin',
    labelEn: 'Super Admin',
    descriptionTr: 'Tüm yetkilere sahiptir. Kullanıcı oluşturur, rol verir, site ayarlarını ve bölüm görünürlüğünü yönetir.',
    descriptionEn: 'Full access. Creates users, assigns roles, manages site settings and section visibility.',
    accent: 'violet',
  },
  ADMIN: {
    labelTr: 'Admin',
    labelEn: 'Admin',
    descriptionTr: 'Verilen bölümlerde içerik yönetir. Kullanıcı oluşturamaz, site ayarlarına erişemez.',
    descriptionEn: 'Manages content in granted sections. Cannot create users or access site settings.',
    accent: 'blue',
  },
  EDITOR: {
    labelTr: 'Editör',
    labelEn: 'Editor',
    descriptionTr: 'Sadece izin verilen bölümlerde içerik ekler/düzenler. Silme ve yayınlama varsayılan olarak kapalıdır.',
    descriptionEn: 'Adds/edits content only in permitted sections. Delete and publish are off by default.',
    accent: 'emerald',
  },
};

export type TemplatePerm = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
};

/**
 * Permission presets — let the super admin assign sensible defaults in one
 * click instead of clicking 36 toggles per user.
 */
export const PERMISSION_TEMPLATES: Array<{
  id: string;
  labelTr: string;
  labelEn: string;
  descriptionTr: string;
  apply: (section: PermissionSectionKey) => TemplatePerm | null;
}> = [
  {
    id: 'none',
    labelTr: 'Hiçbiri',
    labelEn: 'None',
    descriptionTr: 'Tüm bölümleri temizle',
    apply: () => null,
  },
  {
    id: 'viewer',
    labelTr: 'Salt Okuma',
    labelEn: 'Viewer',
    descriptionTr: 'Sadece düzenleme görünürlüğü, hiçbir eylem izni yok',
    apply: () => ({ canCreate: false, canEdit: false, canDelete: false, canPublish: false }),
  },
  {
    id: 'content-editor',
    labelTr: 'İçerik Editörü',
    labelEn: 'Content Editor',
    descriptionTr: 'Makaleler + Medya (C/E), yayınlama ve silme yok',
    apply: (section) => {
      if (section === 'ARTICLE' || section === 'MEDIA') {
        return { canCreate: true, canEdit: true, canDelete: false, canPublish: false };
      }
      return null;
    },
  },
  {
    id: 'publisher',
    labelTr: 'Yayıncı',
    labelEn: 'Publisher',
    descriptionTr: 'Tüm bölümlerde C/E/P, silme kapalı',
    apply: () => ({ canCreate: true, canEdit: true, canDelete: false, canPublish: true }),
  },
  {
    id: 'full',
    labelTr: 'Tam Yetki',
    labelEn: 'Full Access',
    descriptionTr: 'Her bölümde C/E/D/P',
    apply: () => ({ canCreate: true, canEdit: true, canDelete: true, canPublish: true }),
  },
];

export function actionLabel(a: PermissionAction): { tr: string; en: string; short: string } {
  switch (a) {
    case 'canCreate': return { tr: 'Oluştur', en: 'Create', short: 'C' };
    case 'canEdit': return { tr: 'Düzenle', en: 'Edit', short: 'E' };
    case 'canDelete': return { tr: 'Sil', en: 'Delete', short: 'D' };
    case 'canPublish': return { tr: 'Yayınla', en: 'Publish', short: 'P' };
  }
}
