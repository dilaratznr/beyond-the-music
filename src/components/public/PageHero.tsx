/**
 * Editorial page hero (list pages). Consistent eyebrow/title/subtitle/meta
 * pattern across 6 pages; centralized for maintenance.
 */

interface PageHeroProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;          // Bottom meta row (e.g., "12 artists · 5 subgenres")
  backgroundImage?: string | null; // Optional bg (low opacity + gradient overlay)
}

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  meta,
  backgroundImage,
}: PageHeroProps) {
  return (
    <section className="relative w-full min-h-[30vh] md:min-h-[38vh] flex items-end overflow-hidden border-b border-white/5">
      {/* Bg image + gradient (if present) or dark neutral. Shorter than detail heroes. */}
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
                watermark ve yatay çizgi ızgarası vardı; ikisi de
                editoryal tona uymadığı için kaldırıldı. Şimdi sadece
                siyah + çok hafif köşe radial gradient
                (hafif hacim, sessiz). */}
            <div className="absolute inset-0 bg-[#0a0a0b]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,rgba(255,255,255,0.03),transparent_55%)]" />
          </>
        )}
      </div>

      <div className="relative z-10 w-full max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 pb-10 md:pb-14 pt-28 md:pt-32">
        <p className="text-zinc-400 text-[11px] tracking-[0.35em] uppercase mb-4 flex items-center gap-3 font-semibold">
          <span className="w-10 h-px bg-zinc-500" />
          {eyebrow}
        </p>
        <h1
          className="font-editorial leading-[1.05] tracking-[-0.02em] max-w-3xl"
          style={{ fontSize: 'clamp(1.875rem, 3.5vw, 3rem)', fontWeight: 700 }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-5 text-zinc-500 text-sm md:text-base leading-relaxed font-light italic max-w-xl">
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
