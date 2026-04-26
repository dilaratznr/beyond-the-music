/**
 * Audit log helper — kritik admin aksiyonları için kalıcı kayıt.
 *
 * Tasarım kararları:
 *   - PII minimize: IP'yi SHA-256'la hash'leyip yazıyoruz, raw IP DB'ye
 *     girmiyor. Aynı IP'den gelen kayıtlar aynı hash'e sahip → trend
 *     analizi mümkün ama exfiltrate'de bile reverse zor.
 *   - Best-effort: log yazımı başarısız olursa app akışını bozmaz, sadece
 *     console.error'a düşer. Audit log critical-path'i bloke etmemeli.
 *   - Async fire-and-forget: caller `await` etmek zorunda değil; ama
 *     etmesi de zarar vermez (await'te bile DB latency düşük).
 */
import crypto from 'crypto';
import prisma from './prisma';

export interface AuditEntry {
  event: string;
  actorId?: string | null;
  targetId?: string | null;
  targetType?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  detail?: string | null;
}

function hashIp(ip: string | null | undefined): string | null {
  if (!ip || ip === 'unknown') return null;
  return crypto.createHash('sha256').update(ip).digest('hex');
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    // `prisma.auditLog` Prisma client schema'da var — ama generate'i
    // çalıştırmadan editor type'ları bunu bilmiyor. Cast'le geçiyoruz;
    // runtime'da `npm run db:generate` (build script'i otomatik yapar)
    // sonrasında çalışır. Tablo yoksa try/catch yakalar.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    await db.auditLog.create({
      data: {
        event: entry.event,
        actorId: entry.actorId ?? null,
        targetId: entry.targetId ?? null,
        targetType: entry.targetType ?? null,
        ipHash: hashIp(entry.ip),
        userAgent: entry.userAgent?.slice(0, 500) ?? null,
        detail: entry.detail?.slice(0, 1000) ?? null,
      },
    });
  } catch (err) {
    // AuditLog tablosu henüz migrate edilmemişse veya DB ulaşılamazsa,
    // hatayı log'la ama caller'ı patlatma — audit eksikliği bir feature
    // dedicident'i, bir 500'den çok daha az kötü.
    console.error('[audit] failed to write log:', err);
  }
}

/** Helper: NextRequest/Request'ten IP + UA çıkar. */
export function extractContext(req: Request): {
  ip: string | null;
  userAgent: string | null;
} {
  const fwd = req.headers.get('x-forwarded-for');
  const ip =
    (fwd ? fwd.split(',')[0].trim() : null) ||
    req.headers.get('x-real-ip')?.trim() ||
    null;
  const userAgent = req.headers.get('user-agent');
  return { ip, userAgent };
}
