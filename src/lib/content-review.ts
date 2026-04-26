import prisma from './prisma';
import { getUserPermissions } from './permissions';

/**
 * İçerik onay akışı.
 *
 * Mantık:
 *   - Kullanıcının ilgili bölümde `canPublish` yetkisi varsa → direkt
 *     yayınlar, hiçbir review kaydı oluşturulmaz.
 *   - `canPublish` yoksa ama "yayınla" / "zamanla" istedi → içerik
 *     PENDING_REVIEW durumuna çekilir ve ContentReview kuyruğuna atılır.
 *
 * Faz 1'de sadece ARTICLE için kullanılıyor. Faz 2'de diğer bölümler
 * de aynı helper'ı kullanacak şekilde genişletilecek.
 */

export type ReviewSection = 'ARTICLE' | 'ARTIST' | 'ALBUM' | 'GENRE' | 'ARCHITECT' | 'LISTENING_PATH' | 'THEORY' | 'AI_MUSIC' | 'MEDIA';

export type ChangeType = 'CREATE' | 'EDIT';

/**
 * Kullanıcının bir bölümde yayın yetkisi (canPublish) olup olmadığını
 * döndürür. Super Admin'ler her zaman true.
 */
export async function canUserPublish(
  userId: string,
  section: ReviewSection,
): Promise<boolean> {
  const perms = await getUserPermissions(userId);
  if (!perms) return false;
  if (perms.isSuperAdmin) return true;
  return perms.sections[section]?.canPublish ?? false;
}

/**
 * Mevcut bir kayıt için açık (PENDING) bir review var mı kontrol eder.
 * Admin aynı makale için iki kez "Onaya Gönder" tıklarsa çift kayıt
 * oluşmasın diye.
 */
export async function findPendingReview(section: ReviewSection, entityId: string) {
  return prisma.contentReview.findFirst({
    where: { section, entityId, status: 'PENDING' },
  });
}

/**
 * Yeni bir review kaydı oluştur. Aynı entity için zaten PENDING bir
 * kayıt varsa onu günceller (entityTitle / changeType yenilenir).
 *
 * Transaction içinde yapıyoruz — aksi halde iki eş zamanlı "Onaya
 * Gönder" tıkı çift PENDING satır yaratabilir (findFirst + create
 * atomik değil). Transaction tx.contentReview kullanır; yarı yolda
 * birisi araya girerse rollback olur.
 */
export async function submitForReview(params: {
  section: ReviewSection;
  entityId: string;
  entityTitle: string;
  changeType: ChangeType;
  submittedById: string;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.contentReview.findFirst({
      where: { section: params.section, entityId: params.entityId, status: 'PENDING' },
    });
    if (existing) {
      return tx.contentReview.update({
        where: { id: existing.id },
        data: {
          entityTitle: params.entityTitle,
          changeType: params.changeType,
          submittedById: params.submittedById,
          submittedAt: new Date(),
        },
      });
    }
    return tx.contentReview.create({
      data: {
        section: params.section,
        entityId: params.entityId,
        entityTitle: params.entityTitle,
        changeType: params.changeType,
        submittedById: params.submittedById,
        status: 'PENDING',
      },
    });
  });
}

/**
 * Bir review'i onayla — status APPROVED, reviewedBy + reviewedAt set.
 * Caller içeriğin kendi "PUBLISHED" transitionunu ayrıca yapar.
 */
export async function approveReview(reviewId: string, reviewerId: string) {
  return prisma.contentReview.update({
    where: { id: reviewId },
    data: {
      status: 'APPROVED',
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    },
  });
}

/**
 * Bir review'i reddet — status REJECTED, opsiyonel not. Caller içeriğin
 * kendi "DRAFT'a dönüş" transitionunu ayrıca yapar.
 */
export async function rejectReview(
  reviewId: string,
  reviewerId: string,
  note?: string,
) {
  return prisma.contentReview.update({
    where: { id: reviewId },
    data: {
      status: 'REJECTED',
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewNote: note?.trim() || null,
    },
  });
}

/**
 * Yeni oluşturulan entity (Artist/Album/Architect/Genre/ListeningPath)
 * için başlangıç status'unu belirler + gerekiyorsa review kuyruğuna
 * ekler. Çağıran sadece entity'yi `{ status }` ile oluşturmalı;
 * kuyruk kaydı bu helper tarafından yönetilir.
 *
 *   - canPublish=true  → PUBLISHED, review yok
 *   - canPublish=false → PENDING_REVIEW + ContentReview (CREATE)
 */
export async function resolveCreateStatus(params: {
  section: ReviewSection;
  userId: string;
}): Promise<{ status: 'PUBLISHED' | 'PENDING_REVIEW'; requiresReview: boolean }> {
  const canPublish = await canUserPublish(params.userId, params.section);
  return canPublish
    ? { status: 'PUBLISHED', requiresReview: false }
    : { status: 'PENDING_REVIEW', requiresReview: true };
}

/**
 * Entity create edildikten sonra — eğer status PENDING_REVIEW ise
 * ContentReview kuyruğuna CREATE kaydı ekler. Transaction dışında
 * çağrılabilir; submitForReview zaten kendi içinde atomik.
 */
export async function maybeCreateReviewOnCreate(params: {
  section: ReviewSection;
  entityId: string;
  entityTitle: string;
  userId: string;
  status: 'PUBLISHED' | 'PENDING_REVIEW' | 'DRAFT';
}) {
  if (params.status !== 'PENDING_REVIEW') return null;
  return submitForReview({
    section: params.section,
    entityId: params.entityId,
    entityTitle: params.entityTitle,
    changeType: 'CREATE',
    submittedById: params.userId,
  });
}

/**
 * Var olan bir entity üzerinde düzenleme — canPublish'e göre bir
 * sonraki status'u döndürür ve gerekiyorsa review kuyruğuna EDIT
 * kaydı ekler.
 *
 *   - canPublish=true  → her zaman PUBLISHED, review yok
 *   - canPublish=false:
 *       - currentStatus=DRAFT          → DRAFT (yayına almaz)
 *       - currentStatus=PENDING_REVIEW → PENDING_REVIEW (review yeniler)
 *       - currentStatus=PUBLISHED      → PENDING_REVIEW (yayından düşer)
 *
 * Caller entity'yi `{ status: nextStatus }` ile güncellemeli; review
 * kaydı bu helper tarafından yönetilir. `changeType: CREATE/EDIT` farkı
 * review listesinde görünür.
 */
export async function resolveEditStatus(params: {
  section: ReviewSection;
  userId: string;
  entityId: string;
  entityTitle: string;
  currentStatus: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED';
}): Promise<{ status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED'; requiresReview: boolean }> {
  const canPublish = await canUserPublish(params.userId, params.section);
  if (canPublish) {
    // Yetkili kullanıcı → status zaten ne ise öyle kalır (PUBLISHED
    // kayıt publish kalır, DRAFT taslak kalır). Bilinçli bir status
    // değişikliği istiyorlarsa form ayrı bir alan gönderir; bu helper
    // sadece onay kapısıyla ilgili.
    return { status: params.currentStatus, requiresReview: false };
  }

  // canPublish yok — DRAFT düzenlenirse DRAFT kalır (kullanıcı taslak
  // üstünde çalışıyor). PUBLISHED/PENDING değiştirilirse PENDING'e düşer
  // + review kuyruğuna EDIT kaydı.
  if (params.currentStatus === 'DRAFT') {
    return { status: 'DRAFT', requiresReview: false };
  }

  await submitForReview({
    section: params.section,
    entityId: params.entityId,
    entityTitle: params.entityTitle,
    changeType: 'EDIT',
    submittedById: params.userId,
  });
  return { status: 'PENDING_REVIEW', requiresReview: true };
}

/**
 * Song/ArtistGenre gibi alt kayıtlar — kendi status'u olmayan ama parent
 * entity'nin yayın durumunu etkileyen operasyonlar için.
 *
 * Örnek: editör canPublish=false iken yayındaki bir Album'e şarkı
 * ekliyor. Song'un kendi status'u yok, ama parent Album PUBLISHED.
 * Bu durumda:
 *   - Album status → PENDING_REVIEW (public'ten düşer)
 *   - ContentReview kuyruğuna ALBUM/EDIT kaydı
 *
 * Eğer Album zaten DRAFT/PENDING_REVIEW ise hiçbir şey yapmaz
 * (zaten public'te değil, editör rahat çalışabilir).
 *
 * canPublish=true ise no-op.
 */
export async function maybeFlipAlbumOnSongChange(params: {
  albumId: string;
  userId: string;
}): Promise<{ flipped: boolean }> {
  const canPublish = await canUserPublish(params.userId, 'ALBUM');
  if (canPublish) return { flipped: false };

  const album = await prisma.album.findUnique({
    where: { id: params.albumId },
    select: { id: true, title: true, status: true },
  });
  if (!album || album.status !== 'PUBLISHED') return { flipped: false };

  await prisma.album.update({
    where: { id: album.id },
    data: { status: 'PENDING_REVIEW' },
  });
  await submitForReview({
    section: 'ALBUM',
    entityId: album.id,
    entityTitle: album.title,
    changeType: 'EDIT',
    submittedById: params.userId,
  });
  return { flipped: true };
}

/**
 * Bir entity için en son reddedilen review'i döndürür — edit sayfasında
 * "Neden reddedildi?" notu göstermek için. Tablo henüz yoksa sessizce
 * null döner (migration yapılmamış DB'de panel kırılmasın).
 */
export async function getLastRejection(
  section: ReviewSection,
  entityId: string,
): Promise<{
  reviewNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: { name: string } | null;
} | null> {
  try {
    return await prisma.contentReview.findFirst({
      where: { section, entityId, status: 'REJECTED' },
      orderBy: { reviewedAt: 'desc' },
      select: {
        reviewNote: true,
        reviewedAt: true,
        reviewedBy: { select: { name: true } },
      },
    });
  } catch {
    return null;
  }
}

/**
 * Bekleyen review sayısı — sidebar badge'i ve dashboard için.
 *
 * `npm run db:push` henüz çalıştırılmamışsa ContentReview tablosu DB'de
 * bulunmaz; Prisma "relation does not exist" hatası atar. Bu admin
 * panelinin tamamen kırılmasına yol açmamalı — dashboard için sessizce
 * 0 dönüyoruz ve Super Admin migration yapana kadar olağan çalışmaya
 * devam ediyor.
 */
export async function countPendingReviews(): Promise<number> {
  try {
    return await prisma.contentReview.count({ where: { status: 'PENDING' } });
  } catch (err) {
    console.warn('[content-review] count hatası — migration yapıldı mı?', err);
    return 0;
  }
}
