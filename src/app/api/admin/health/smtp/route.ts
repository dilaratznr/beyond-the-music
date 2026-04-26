import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

/**
 * GET /api/admin/health/smtp
 *
 * Sadece SUPER_ADMIN. Runtime'da SMTP env'lerinin SET olup olmadığını
 * döner — değerleri ASLA sızdırmaz, sadece boolean. Debug için.
 *
 * Kullanım: davet gönderirken "SMTP yapılandırılmamış" hatası alıyorsan
 * bu endpoint'e bak; hangi env eksik kalmışsa true/false ile gözükür.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireAuth('SUPER_ADMIN');
  if (error) return error;

  const env = (key: string) => {
    const v = process.env[key];
    return {
      set: !!v,
      length: v ? v.length : 0,
    };
  };

  return NextResponse.json({
    SMTP_HOST: env('SMTP_HOST'),
    SMTP_PORT: env('SMTP_PORT'),
    SMTP_USER: env('SMTP_USER'),
    SMTP_PASSWORD: env('SMTP_PASSWORD'),
    SMTP_FROM: env('SMTP_FROM'),
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
}
