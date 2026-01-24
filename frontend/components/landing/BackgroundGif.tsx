"use client";

import Image from "next/image";

interface BackgroundGifProps {
  speed?: number;
  className?: string;
}

export default function BackgroundGif({ speed = 0.5, className = "" }: BackgroundGifProps) {
  return (
    <div className={`absolute inset-0 z-0 w-full h-full overflow-hidden ${className}`}>
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          transform: "scale(1.1)",
          filter: "brightness(0.9)",
        }}
      >
        <Image
          src="/bg.gif"
          alt=""
          fill
          className="!object-cover"
          unoptimized
          priority
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      </div>
      {/* Overlay gradient to ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/50" />
      {/* Slow animation overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          animation: "slowFade 10s ease-in-out infinite",
          background: "radial-gradient(circle at center, rgba(0,0,0,0.15) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
