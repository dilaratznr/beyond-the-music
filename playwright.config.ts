import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — sadece smoke test'lere odaklan.
 *
 * `webServer` Next dev server'ı otomatik açıyor; CI'da `next start`'a
 * geçirmek istersen `command: 'npm run start'` + `npm run build` ön
 * adımıyla. Şimdilik dev mode yeter çünkü test'ler render + auth-guard
 * davranışını kontrol ediyor, prod-only optimizasyon path'ine girmiyor.
 *
 * `forbidOnly` CI'da `.only` bırakılan test'in sessizce skip edilmesini
 * engeller. `retries: 1` flake'leri yumuşatır ama gizlemez.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});
