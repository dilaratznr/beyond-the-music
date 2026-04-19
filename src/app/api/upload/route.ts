import { NextRequest, NextResponse } from 'next/server';
import { requireSectionAccess } from '@/lib/auth-guard';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';

// Mime → canonical extension. We derive the extension from the validated
// mime type rather than trusting the original filename, which prevents
// callers from sneaking in mismatched extensions.
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const ALLOWED_TYPES = Object.keys(MIME_TO_EXT);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_CATEGORIES = new Set([
  'artist',
  'album',
  'genre',
  'article',
  'architect',
  'listening-path',
  'hero',
  'other',
]);

export async function POST(request: NextRequest) {
  const { error } = await requireSectionAccess('MEDIA', 'canCreate');
  if (error) return error;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: JPG, PNG, WebP, GIF' },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Empty file' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum 5MB' },
      { status: 400 },
    );
  }

  const rawCategory = (formData.get('category') as string | null)?.trim() || 'other';
  const category = ALLOWED_CATEGORIES.has(rawCategory) ? rawCategory : 'other';

  // entityId is optional — pass null/empty for unattached library uploads.
  const entityIdRaw = (formData.get('entityId') as string | null)?.trim() || '';
  const entityId = entityIdRaw || 'unattached';

  const ext = MIME_TO_EXT[file.type];
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  let url: string;
  let storage: 's3' | 'local';

  if (
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET_NAME
  ) {
    try {
      url = await saveToS3(filename, buffer, file.type);
      storage = 's3';
    } catch (s3Error) {
      console.error('[upload] S3 failed, falling back to local:', s3Error);
      url = await saveLocally(filename, buffer);
      storage = 'local';
    }
  } else {
    url = await saveLocally(filename, buffer);
    storage = 'local';
  }

  const item = await prisma.mediaItem.create({
    data: {
      url,
      type: 'IMAGE',
      entityType: category,
      entityId,
    },
  });

  return NextResponse.json({ id: item.id, url, category, storage });
}

async function saveToS3(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'auto',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    endpoint: process.env.AWS_S3_ENDPOINT_URL || undefined,
  });

  const key = `uploads/${filename}`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    }),
  );

  // AWS_S3_PUBLIC_DOMAIN must be set for R2 / custom CDN domains.
  // For native AWS S3 we fall back to the regional virtual-hosted URL.
  const publicDomain =
    process.env.AWS_S3_PUBLIC_DOMAIN ||
    `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;
  return `${publicDomain.replace(/\/+$/, '')}/${key}`;
}

async function saveLocally(filename: string, buffer: Buffer): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
}

export async function GET() {
  const { error } = await requireSectionAccess('MEDIA', 'canCreate');
  if (error) return error;

  const items = await prisma.mediaItem.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json(items);
}
