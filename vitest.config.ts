import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Vitest config — sadece pure unit'lara odaklan.
 *
 * Neden Next/React entegrasyonu yok: bu testler crypto, DOMPurify ve
 * basit string util gibi DB/IO bağımsız modülleri kapsıyor. UI ve
 * akış testleri Playwright e2e tarafına yazılıyor.
 *
 * `include` → tests/unit altındaki *.test.ts dosyalarını alır,
 * Playwright'un `tests/e2e` klasörüne hiç dokunmaz.
 */
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
