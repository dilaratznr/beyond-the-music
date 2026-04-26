/**
 * Admin route transition loading state.
 *
 * Next.js App Router bu component'i route segment async iş yaparken
 * otomatik gösterir. ESKİDEN burada büyük bir dashboard-skeleton vardı
 * ama her sayfa geçişinde flash ediyordu — SWR cache hit olduğunda bile
 * ekran kısa süreliğine boş skeleton'la doluyor, sonra gerçek içerik
 * geliyordu. Bu shimmer hissini doğuruyor.
 *
 * Şimdi: sadece üstte ince bir progress indicator. Layout shift yok,
 * içerik alanı boş kalmıyor, kullanıcı geçişin var olduğunu fark
 * ediyor ama "her şey yeniden yüklendi" hissi yok. Asıl loading
 * state'i page-level component'ler kendi (SWR isLoading) yönetir.
 */
export default function AdminLoading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden pointer-events-none"
    >
      <div className="h-full bg-gradient-to-r from-transparent via-zinc-100 to-transparent animate-route-progress" />
    </div>
  );
}
