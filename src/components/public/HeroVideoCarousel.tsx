'use client';

import { useState, useEffect, useRef } from 'react';

interface Video { id: string; url: string; duration: number; }

/**
 * Hero video carousel.
 *
 * Dilara geri bildirim evrimi:
 *   1. (2026-04-23) "site acilirken bi gorsel geliyo 1 sn lik orda bug
 *      var" — <video poster={...}> Unsplash default'unu ~1s flash
 *      ediyordu. Çözüm: poster'ı kaldır, altta siyah bg bırak, video
 *      geldiğinde üste biniyor.
 *   2. (2026-04-24) "video takiliyor anasayfadaki bir sey olmus
 *      bozulmus" — önceki iterasyonda `videoReady` state + opacity
 *      toggling + `preload="auto"` koymuştum; state güncellemeleri
 *      video oynatma pipeline'ına müdahale ediyor, re-render'lar
 *      playhead'i resetliyor ve stutter hissi yaratıyordu. Kaldırıldı.
 *
 * Şimdiki minimal kural:
 *   - poster YOK → flash yok
 *   - altta bg-[#0a0a0b] div → video hazır olmadan önce görünen şey
 *     sahne rengiyle aynı, kullanıcı fark etmiyor
 *   - opacity sadece carousel geçişinde fade için (fading state) —
 *     loading ile ilgili JS yok, browser'ın kendi video akışına
 *     müdahale etmiyoruz
 *   - preload default (metadata) — `auto` bant genişliğini aç gözlü
 *     tüketip stutter'a yol açıyordu.
 */
export default function HeroVideoCarousel({ videos, fallbackImage }: { videos: Video[]; fallbackImage: string }) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout>(undefined);

  const activeVideos = videos.filter((v) => v.url);

  useEffect(() => {
    if (activeVideos.length <= 1) return;

    function scheduleNext() {
      const dur = activeVideos[current]?.duration || 10;
      timerRef.current = setTimeout(() => {
        setFading(true);
        setTimeout(() => {
          setCurrent((prev) => (prev + 1) % activeVideos.length);
          setFading(false);
        }, 600);
      }, dur * 1000);
    }

    scheduleNext();
    return () => clearTimeout(timerRef.current);
  }, [current, activeVideos.length]);

  // Carousel current değiştiğinde video kaynağı değiştiği için yeniden
  // load + play çağrılıyor. Tek video varsa current zaten değişmez, bu
  // effect sadece mount'ta çalışır → play kick-start.
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [current]);

  if (activeVideos.length === 0) {
    return <img src={fallbackImage} alt="" className="w-full h-full object-cover animate-ken-burns" />;
  }

  const src = activeVideos[current]?.url;

  return (
    <>
      {/* Video yüklenmeden önce görünen siyah arka plan — sahne rengiyle
          aynı olduğu için "yüklendi mi?" hissi vermiyor. */}
      <div className="absolute inset-0 bg-[#0a0a0b]" aria-hidden="true" />
      <video
        ref={videoRef}
        autoPlay muted loop={activeVideos.length === 1} playsInline
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        style={{ opacity: fading ? 0 : 1 }}
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Video indicator dots */}
      {activeVideos.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {activeVideos.map((_, i) => (
            <button key={i} onClick={() => { clearTimeout(timerRef.current); setFading(true); setTimeout(() => { setCurrent(i); setFading(false); }, 300); }}
              className={`h-1 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/50'}`} />
          ))}
        </div>
      )}
    </>
  );
}
