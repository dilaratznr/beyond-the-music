import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma'nın `prisma generate`'le ürettiği client runtime — bizim
    // yazdığımız kod değil, lint'te görünmesi gereksiz gürültü.
    "src/generated/**",
    // Test çıktıları
    "test-results/**",
    "playwright-report/**",
  ]),
  // Proje genel kuralları
  {
    rules: {
      // React 19 ile gelen yeni kural — useEffect içinde setState çağrısı
      // varsayılanda error. Codebase'imizde bu pattern bilinçli ve yaygın
      // (SWR fetch → local editable state, debounced search reset, prop-
      // sync). Her birini useMemo'a çevirmek kullanıcı etkileşimini
      // bozar. Performans uyarısı olarak warning'e indiriyoruz; gerçek
      // bir cascading-render bug çıkarsa diff review'da yakalanır.
      "react-hooks/set-state-in-effect": "warn",

      // <img> vs next/image — bilinçli mimari kararı. Görsel pipeline'ımız
      // self-hosted: kullanıcı upload edince `src/lib/image-processing.ts`
      // sharp ile WebP'e dönüştürüyor, R2'ye atıyor. Browser direkt R2'den
      // optimize edilmiş dosyayı çekiyor. Vercel Image Optimization üstüne
      // tekrar transform yapsa para harcatır + double-encoding kalitesi
      // bozar. CardImage'ın `onError → fallback gradient` davranışı da
      // next/image API'sine 1:1 çevrilmiyor. Bu kuralı kapatıyoruz —
      // dekoratif görseller için <img> kasıtlı tercih.
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
