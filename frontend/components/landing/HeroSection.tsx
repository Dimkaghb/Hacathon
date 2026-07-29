"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { IconArrowRight } from "@tabler/icons-react";
import { WordsPullUp } from "./TextAnimations";
import { DitherShader } from "@/components/ui/dither-shader";
import { PRELOADER_DURATION } from "./Preloader";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function HeroSection() {
  return (
    <section className="h-screen w-full p-4 md:p-6">
      <div className="relative h-full w-full overflow-hidden rounded-2xl md:rounded-[2rem]">
        {/* Background image */}
        <Image
          src="/hero-bg.png"
          alt="AI-generated cinematic scene"
          fill
          priority
          className="object-cover"
        />

        {/* Dither effect — Bayer-dithered copy of the image blended on top */}
        <DitherShader
          src="/hero-bg.png"
          gridSize={2}
          ditherMode="bayer"
          colorMode="original"
          objectFit="cover"
          className="absolute inset-0 opacity-60 pointer-events-none"
        />

        {/* Noise + gradient overlays */}
        <div className="noise-overlay absolute inset-0 opacity-[0.7] mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        {/* Hero content — bottom-aligned */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 sm:px-8 sm:pb-8 md:px-10 md:pb-10">
          <div className="grid grid-cols-12 items-end gap-6 md:gap-8">
            {/* Giant heading */}
            <div className="col-span-12 lg:col-span-8">
              <WordsPullUp
                text="Axel"
                showAsterisk
                delayStart={PRELOADER_DURATION + 0.2}
                className="text-[26vw] sm:text-[24vw] md:text-[22vw] lg:text-[20vw] xl:text-[19vw] 2xl:text-[20vw] font-medium leading-[0.85] tracking-[-0.07em]"
                style={{ color: "#E1E0CC" }}
              />
            </div>

            {/* Description + CTA */}
            <div className="col-span-12 lg:col-span-4 flex flex-col items-start gap-5 lg:pb-[2vw]">
              <motion.p
                className="text-primary/70 text-xs sm:text-sm md:text-base max-w-md"
                style={{ lineHeight: 1.2 }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.6,
                  delay: PRELOADER_DURATION + 0.6,
                  ease: EASE,
                }}
              >
                Axel is a node-based platform for AI video generation. Upload
                images, craft prompts, and chain videos on a visual canvas —
                powered by Google Veo 3.1 with character consistency built in.
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.6,
                  delay: PRELOADER_DURATION + 0.8,
                  ease: EASE,
                }}
              >
                <Link
                  href="/main"
                  className="group inline-flex items-center gap-2 hover:gap-3 bg-primary rounded-full pl-5 pr-1.5 py-1.5 text-black font-medium text-sm sm:text-base transition-all"
                >
                  Launch Canvas
                  <span className="flex items-center justify-center bg-black rounded-full w-9 h-9 sm:w-10 sm:h-10 transition-transform group-hover:scale-110">
                    <IconArrowRight size={18} color="#E1E0CC" />
                  </span>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
