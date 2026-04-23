/**
 * Editorial page hero — liste/top-level sayfalar için tutarlı header.
 *
 * Dil: homepage hero + detay sayfaları hero'larıyla aynı ritim —
 *   [eyebrow çizgi + küçük CAPS]
 *   [büyük Fraunces(→ Manrope) başlık]
 *   [italik subtitle — dergi taglinesi]
 *   [meta satırı: sayı/durum etiketleri]
 *
 * Neden ayrı komponent: 6 liste sayfası (genre/artist/architects/theory/
 * ai-music/listening-paths) aynı pattern'i kullanıyor. Inline yazınca
 * 6 kopya olacak, düzeltme gerekirse hepsini ayrı ayrı dokunmak gerekir.
 */

interface PageHeroProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Altta küçük meta/stat satırı — "12 sanatçı · 5 alt tür" gibi */
  meta?: React.ReactNode;
  /** Opsiyonel arka plan görseli — varsa düşük opacity + gradient ile basılır */
  backgroundImage?: string | null;
}

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  meta,
  backgroundImage,
}: PageHeroProps) {
  return (
    <section className="relative w-full min-h-[45vh] md:min-h-[55vh] flex items-end overflow-hidden border-b border-white/5">
      {/* Arka plan — görsel varsa + gradient, yoksa sadece karanlık
          nötr bg. Detay hero'larına göre daha kısa (min-h-[55vh]) —
          bu sayfalar liste içeriğini hemen göstermeli, hero tam bir
          kapak olmamalı. */}
      <div className="absolute inset-0">
        {backgroundImage ? (
          <>
            <img
              src={backgroundImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-black/65 to-black/40" />
          </>
        ) : (
          <>
            {/* Sade arka plan — önceden sağ kenarda büyük tek-harf
                watermark vardı (S, M, T...); Dilara feedback: "aşırı
                saçma duruyor". Yerine çok hafif radial gradient +
                editoryel yatay çizgi ızgarası (dergi kapak alt rejimi
                hissi) — karakterli ama bağırmıyor. */}
            <div className="absolute inset-0 bg-[#0a0a0b]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,rgba(255,255,255,0.035),transparent_55%)]" />
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(255,255,255,0.5) 48px, rgba(255,255,255,0.5) 49px)',
              }}
              aria-hidden="true"
            />
          </>
        )}
      </div>

      <div className="relative z-10 w-full max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 pb-12 md:pb-16 pt-32">
        <p className="text-zinc-400 text-[11px] md:text-[12px] tracking-[0.35em] uppercase mb-5 flex items-center gap-3 font-semibold">
          <span className="w-10 h-px bg-zinc-500" />
          {eyebrow}
        </p>
        <h1
          className="font-editorial leading-[1] tracking-[-0.025em] max-w-4xl"
          style={{ fontSize: 'clamp(2.25rem, 5vw, 4.5rem)', fontWeight: 700 }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-6 text-zinc-500 text-base md:text-lg leading-relaxed font-light italic max-w-xl">
            {subtitle}
          </p>
        )}
        {meta && (
          <div className="mt-6 md:mt-8 flex items-center gap-5 flex-wrap text-[13px] text-zinc-400 font-medium">
            {meta}
          </div>
        )}
      </div>
    </section>
  );
}
