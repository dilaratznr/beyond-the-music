import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import prisma from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSectionAccess('MEDIA', 'canDelete');
  if (error) return error;

  const { id } = await params;

  const mediaItem = await prisma.mediaItem.findUnique({ where: { id } });
  if (!mediaItem) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  await prisma.mediaItem.delete({ where: { id } });
  revalidateTag(CACHE_TAGS.mediaItem, 'max');

  // Best-effort storage cleanup — DB row is already gone either way.
  try {
    if (mediaItem.url.startsWith('/uploads/')) {
      await deleteLocal(mediaItem.url);
    } else if (isS3Url(mediaItem.url)) {
      await deleteFromS3(mediaItem.url);
    }
  } catch (err) {
    console.error('[upload:delete] storage cleanup failed:', err);
    // non-fatal
  }

  return NextResponse.json({ success: true });
}

async function deleteLocal(url: string): Promise<void> {
  const filename = path.basename(url);
  // Hard-bound to the uploads dir so a crafted url can't walk the FS.
  if (!/^[\w.-]+$/.test(filename)) return;
  const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
  try {
    await fs.unlink(filePath);
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
}

function isS3Url(url: string): boolean {
  if (!process.env.AWS_S3_BUCKET_NAME) return false;
  const publicDomain = process.env.AWS_S3_PUBLIC_DOMAIN;
  if (publicDomain && url.startsWith(publicDomain.replace(/\/+$/, ''))) return true;
  return url.includes(`${process.env.AWS_S3_BUCKET_NAME}.s3.`);
}

async function deleteFromS3(url: string): Promise<void> {
  if (
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY ||
    !process.env.AWS_S3_BUCKET_NAME
  ) {
    return;
  }
  // Derive S3 key from URL (everything after the last `/uploads/`).
  const marker = '/uploads/';
  const idx = url.lastIndexOf(marker);
  if (idx === -1) return;
  const key = 'uploads/' + url.slice(idx + marker.length);

  const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'auto',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    endpoint: process.env.AWS_S3_ENDPOINT_URL || undefined,
  });

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    }),
  );
}
