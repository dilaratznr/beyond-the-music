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
 */
export async function submitForReview(params: {
  section: ReviewSection;
  entityId: string;
  entityTitle: string;
  changeType: ChangeType;
  submittedById: string;
}) {
  const existing = await findPendingReview(params.section, params.entityId);
  if (existing) {
    return prisma.contentReview.update({
      where: { id: existing.id },
      data: {
        entityTitle: params.entityTitle,
        changeType: params.changeType,
        submittedById: params.submittedById,
        submittedAt: new Date(),
      },
    });
  }
  return prisma.contentReview.create({
    data: {
      section: params.section,
      entityId: params.entityId,
      entityTitle: params.entityTitle,
      changeType: params.changeType,
      submittedById: params.submittedById,
      status: 'PENDING',
    },
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
