"use client";

import Link from "next/link";
import BackgroundGif from "./BackgroundGif";

export default function HeroSection() {
  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 text-center">
      <BackgroundGif speed={0.5} />
      
      <div className="max-w-[1440px] relative z-10 flex flex-col gap-8 items-center">
        <h1 className="max-w-4xl font-[family-name:var(--font-inter-display)] text-4xl font-light leading-[1.2] tracking-tight text-[#d1d9e6] sm:text-5xl md:text-6xl">
          Transform ideas into AI-powered videos
        </h1>
      </div>
    </section>
  );
}
