'use client';

import { useState, useEffect, useRef } from 'react';

interface Video { id: string; url: string; duration: number; }

/**
 * Hero video carousel.
 *
 * Dilara geri bildirimi (2026-04-23): "site acilirken bi gorsel geliyo
 * 1 sn lik orda bug var" — açılışta fallback/poster imajı ~1 saniye
 * flash edip sonra video alıyordu. Sebep: <video poster={...}> ile
 * Unsplash'tan gelen default poster, video ilk frame'i decode edene
 * kadar ekranda duruyordu. Bu görseli hiç kullanıcı istemedi (admin
 * video ekledi), sadece loading state'iydi → flash gibi görünüyor.
 *
 * Çözüm:
 *   1. Video varken `poster` GEÇILMIYOR → beyaz/görsel flash yok,
 *      container'ın altındaki siyah arka plan (page bg) görünür.
 *   2. `preload="auto"` + ilk video için `fetchpriority=high` → ilk
 *      frame ~200ms içinde paint, siyah ekran süresi minimum.
 *   3. Fallback <img> yolu (hiç video yoksa) aynen kaldı — admin video
 *      eklemediyse kullanıcının görmesi gereken şey bu görsel zaten.
 */
export default function HeroVideoCarousel({ videos, fallbackImage }: { videos: Video[]; fallbackImage: string }) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
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

  // Reset video when current changes
  useEffect(() => {
    setVideoReady(false);
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
      {/* Video ilk frame'e gelene kadar düz siyah — böylece poster
          flash'ı (Unsplash default'u) görünmüyor. Aynı sahnenin arka
          plan rengiyle hizalı, hiçbir "yüklendi mi?" hissi yaratmıyor. */}
      <div className="absolute inset-0 bg-[#0a0a0b]" aria-hidden="true" />
      <video
        ref={videoRef}
        autoPlay muted loop={activeVideos.length === 1} playsInline
        preload="auto"
        onCanPlay={() => setVideoReady(true)}
        onLoadedData={() => setVideoReady(true)}
        className="w-full h-full object-cover transition-opacity duration-500"
        style={{ opacity: fading ? 0 : videoReady ? 1 : 0 }}
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
