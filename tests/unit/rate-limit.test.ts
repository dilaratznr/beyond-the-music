import { describe, it, expect } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Sliding-window limiter'ın brute-force koruması garantisi en kritik
 * davranış. Burada o davranışı pin'liyoruz: limit'e gelene kadar geçer,
 * ondan sonra reddeder; pencere ilerleyince yeniden açılır.
 *
 * Test'ler tamamen in-memory — `Date.now()` üzerinden çalışıyor, mock
 * gerekmiyor çünkü pencere milisaniyeleri gerçek zamanda geçecek kadar
 * kısa. Her testte UNIQUE bir key kullanıyoruz; rateLimit modül-seviye
 * `buckets` map'i tutuyor, paylaşılırsa flake riski var.
 */
describe('rateLimit', () => {
  it('limit altındaki istekler success döner', () => {
    const key = `test:under-${Math.random()}`;
    const r1 = rateLimit(key, 3, 60_000);
    const r2 = rateLimit(key, 3, 60_000);
    const r3 = rateLimit(key, 3, 60_000);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('limit aşıldığında success=false ve remaining=0 döner', () => {
    const key = `test:over-${Math.random()}`;
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    const r3 = rateLimit(key, 2, 60_000);
    expect(r3.success).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.resetInMs).toBeGreaterThanOrEqual(0);
  });

  it('eski timestamp pencere dışına çıkınca yeniden izin verir', async () => {
    const key = `test:reset-${Math.random()}`;
    rateLimit(key, 1, 50);
    const r2 = rateLimit(key, 1, 50);
    expect(r2.success).toBe(false);
    // Pencereyi geçecek kadar bekle (50ms + buffer)
    await new Promise((r) => setTimeout(r, 70));
    const r3 = rateLimit(key, 1, 50);
    expect(r3.success).toBe(true);
  });

  it('farklı keyler birbirinden bağımsız', () => {
    const a = `test:keyA-${Math.random()}`;
    const b = `test:keyB-${Math.random()}`;
    rateLimit(a, 1, 60_000);
    const aSecond = rateLimit(a, 1, 60_000);
    const bFirst = rateLimit(b, 1, 60_000);
    expect(aSecond.success).toBe(false);
    expect(bFirst.success).toBe(true);
  });
});
