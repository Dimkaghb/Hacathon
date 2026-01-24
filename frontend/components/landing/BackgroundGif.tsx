"use client";

import { useEffect, useRef } from "react";

interface BackgroundGifProps {
  speed?: number;
  className?: string;
}

export default function BackgroundGif({ speed = 0.5, className = "" }: BackgroundGifProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (videoRef.current) {
            if (entry.isIntersecting) {
              videoRef.current.play().catch(() => {});
            } else {
              videoRef.current.pause();
            }
          }
        });
      },
      {
        threshold: 0.1,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 z-0 w-full h-full overflow-hidden ${className}`} 
      style={{ willChange: "transform" }}
    >
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          transform: "scale(1.1) translateZ(0)",
          filter: "brightness(0.9)",
          willChange: "transform",
        }}
      >
        <video
          ref={videoRef}
          src="/bg.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            objectPosition: "center",
            transform: "translateZ(0)",
            willChange: "transform",
          }}
        />
      </div>
      <div className="absolute inset-0 bg-black/40 pointer-events-none" style={{ transform: "translateZ(0)" }} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/50 pointer-events-none" style={{ transform: "translateZ(0)" }} />
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          animation: "slowFade 70s ease-in-out infinite",
          background: "radial-gradient(circle at center, rgba(0,0,0,0.2) 0%, transparent 70%)",
          filter: "blur(1px)",
          transform: "translateZ(0)",
          willChange: "opacity, transform",
        }}
      />
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          animation: "slowFade2 15s ease-in-out infinite",
          background: "radial-gradient(ellipse at 30% 50%, rgba(0,0,0,0.15) 0%, transparent 60%)",
          transform: "translateZ(0)",
          willChange: "opacity, transform",
        }}
      />
    </div>
  );
}
