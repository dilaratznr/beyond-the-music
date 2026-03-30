'use client';

import { useState, useEffect, useRef } from 'react';

interface Video { id: string; url: string; duration: number; }

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

  // Reset video when current changes
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
      <video
        ref={videoRef}
        autoPlay muted loop={activeVideos.length === 1} playsInline
        className="w-full h-full object-cover transition-opacity duration-500"
        style={{ opacity: fading ? 0 : 1 }}
        poster={fallbackImage}
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
