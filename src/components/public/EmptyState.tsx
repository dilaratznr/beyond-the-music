/**
 * Editorial empty-state — listelerde henüz içerik yoksa gösterilen blok.
 *
 * Sade bir dergi "bu bölüm yakında doldurulacak" ajuresi hissi veriyor:
 * ince çizgi, büyük italik Fraunces mesajı, alt satırda küçük yardımcı
 * metin. Yüksek-kontrast emoji/ikona ya da renkli kart'a gitmedik —
 * sitenin geri kalanıyla tutarlı dingin bir ton.
 *
 * Kullanım:
 *   <EmptyState title="Henüz sanatçı yok" hint="Admin panelinden ilk sanatçıyı ekle." />
 */
export function EmptyState({
  title,
  hint,
  className = '',
}: {
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`w-full py-20 md:py-28 text-center border-t border-white/10 ${className}`}>
      <p className="font-editorial italic text-zinc-500 text-2xl md:text-3xl leading-snug max-w-md mx-auto">
        {title}
      </p>
      {hint && (
        <p className="mt-4 text-[11px] uppercase tracking-[0.3em] text-zinc-600 font-bold">
          {hint}
        </p>
      )}
    </div>
  );
}

export default EmptyState;
