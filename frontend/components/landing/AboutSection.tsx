"use client";

import { useEffect, useRef, useState } from "react";

export default function AboutSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !shouldLoadVideo) {
            setShouldLoadVideo(true);
          }
          if (videoRef.current && shouldLoadVideo) {
            if (entry.isIntersecting) {
              videoRef.current.play().catch(() => {});
            } else {
              videoRef.current.pause();
            }
          }
        });
      },
      {
        rootMargin: "100px",
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
  }, [shouldLoadVideo]);

  return (
    <section className="w-full bg-[#0a0a0a] px-6 py-24 md:px-12">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-12 lg:flex-row">
        <div className="flex flex-1 flex-col justify-between gap-16">
          <div className="flex flex-col gap-8">
            <h2 className="font-serif text-4xl font-normal leading-tight text-[#ededed] md:text-5xl lg:text-6xl">
              Node-based video generation
            </h2>
            
            <div className="flex max-w-2xl flex-col gap-6 text-lg font-light leading-relaxed text-[#ededed]/80">
              <p>
                Axel is a node-based platform for AI video generation. Upload images, create prompts, and generate videos using Google Veo 3.1. Our platform ensures character consistency through face embeddings and supports video extensions up to 20x.
              </p>
              <p>
                Connect nodes on a visual canvas to build complex workflows. Enhance prompts with AI, maintain character consistency across videos, and extend your creations seamlessly. Everything you need to create professional AI-generated videos in minutes.
              </p>
            </div>
          </div>
        </div>
        
        <div 
          ref={containerRef}
          className="relative aspect-[9/16] md:aspect-[3/4] lg:aspect-[4/5] max-h-[400px] md:max-h-[450px] lg:max-h-[500px] min-h-[300px] md:min-h-[350px] w-full lg:w-auto lg:flex-1 overflow-hidden rounded-2xl flex items-center justify-center bg-black/20"
          style={{ transform: "translateZ(0)", willChange: "transform" }}
        >
          {shouldLoadVideo ? (
            <video
              ref={videoRef}
              src="/heroVideo.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              className="w-full h-full object-cover"
                style={{ 
                objectPosition: "center top",
                transform: "translateZ(0)",
                willChange: "transform",
              }}
            />
          ) : (
            <div className="w-full h-full bg-black/40" />
          )}
        </div>
      </div>
    </section>
  );
}
