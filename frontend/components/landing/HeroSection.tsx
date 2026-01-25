"use client";

import BackgroundGif from "./BackgroundGif";
import BlurText from "../BlurText";

export default function HeroSection() {
  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 text-center">
      <BackgroundGif speed={0.5} />
      
      <div className="max-w-[1440px] relative z-10 flex flex-col gap-8 items-center">
        <BlurText
          text="Transform ideas into AI-powered videos"
          className="max-w-4xl font-[family-name:var(--font-melodrama)] text-5xl font-light leading-[1.2] tracking-tight text-[#d1d9e6] sm:text-6xl md:text-7xl lg:text-8xl"
          animateBy="all"
          direction="top"
          delay={0}
          stepDuration={0.25}
        />
      </div>
    </section>
  );
}
