"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

export default function AboutSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
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
    <section className="w-full bg-[#0a0a0a] px-6 py-24 md:px-12" ref={sectionRef}>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-12 lg:flex-row">
        <motion.div 
          className="flex flex-1 flex-col justify-between gap-16"
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="flex flex-col gap-8">
            <motion.h2 
              className="font-serif text-4xl font-normal leading-tight text-[#ededed] md:text-5xl lg:text-6xl"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Node-based video generation
            </motion.h2>
            
            <motion.div 
              className="flex max-w-2xl flex-col gap-6 text-lg font-light leading-relaxed text-[#ededed]/80"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                Axel is a node-based platform for AI video generation. Upload images, create prompts, and generate videos using Google Veo 3.1. Our platform ensures character consistency through face embeddings and supports video extensions up to 20x.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                Connect nodes on a visual canvas to build complex workflows. Enhance prompts with AI, maintain character consistency across videos, and extend your creations seamlessly. Everything you need to create professional AI-generated videos in minutes.
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
        
        <motion.div 
          ref={containerRef}
          className="relative aspect-[9/16] md:aspect-[3/4] lg:aspect-[4/5] max-h-[400px] md:max-h-[450px] lg:max-h-[500px] min-h-[300px] md:min-h-[350px] w-full lg:w-auto lg:flex-1 overflow-hidden rounded-2xl flex items-center justify-center bg-black/20"
          style={{ transform: "translateZ(0)", willChange: "transform" }}
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={isInView ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 50, scale: 0.95 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
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
        </motion.div>
      </div>
    </section>
  );
}
