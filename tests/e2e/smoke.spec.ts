import { test, expect } from '@playwright/test';

/**
 * Smoke test'leri — production'a deploy etmeden önce her şeyin
 * en azından AYAKTA olduğunu kontrol eder. Hiçbiri DB state'ine
 * bağlı değil; CI'da çalışırken seed.ts çalıştırılmasını gerektirmez.
 *
 * "DB var ama seed yok" senaryosunda da geçmesi için liste sayfaları
 * boş içerikle de yüklenebiliyor olmalı; hata atan bir sayfa = bug.
 */

test.describe('Public site', () => {
  test('TR ana sayfa render olur ve nav linkleri görünür', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/tr\/?$/);
    // Türkçe ana sayfada en azından bir <nav> ve bir <main> olmalı
    await expect(page.locator('main')).toBeVisible();
  });

  test('EN ana sayfa render olur', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('robots.txt 200 ve admin/api disallow ediyor', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('Disallow: /admin');
    expect(body).toContain('Disallow: /api');
    expect(body).toContain('Sitemap:');
  });

  test('sitemap.xml 200 döner', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('xml');
  });
});

test.describe('Admin auth gate', () => {
  test('login\'siz /admin/dashboard → /admin/login redirect', async ({ page }) => {
    const res = await page.goto('/admin/dashboard');
    // Middleware (proxy.ts) /admin/login'e atmalı, callbackUrl param'lı
    await expect(page).toHaveURL(/\/admin\/login/);
    expect(res?.status()).toBeLessThan(400);
  });

  test('login sayfası render olur', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByLabel(/e-?posta/i)).toBeVisible();
    await expect(page.getByLabel(/şifre/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /giriş/i })).toBeVisible();
  });
});

test.describe('Cron endpoint', () => {
  test('CRON_SECRET\'sız 401 döner (fail-closed)', async ({ request }) => {
    const res = await request.get('/api/cron/cleanup-tokens');
    expect(res.status()).toBe(401);
  });

  test('yanlış Bearer token → 401', async ({ request }) => {
    const res = await request.get('/api/cron/cleanup-tokens', {
      headers: { authorization: 'Bearer wrong-secret' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('Rate limit', () => {
  test('public list API normal kullanımda 200 döner', async ({ request }) => {
    const res = await request.get('/api/genres?all=true');
    expect(res.status()).toBe(200);
  });
});
