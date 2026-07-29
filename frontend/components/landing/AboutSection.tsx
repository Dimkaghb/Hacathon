"use client";

import { WordsPullUpMultiStyle, ScrollRevealText } from "./TextAnimations";

export default function AboutSection() {
  return (
    <section className="w-full bg-black px-4 py-16 md:px-6 md:py-24">
      <div className="mx-auto max-w-6xl rounded-2xl md:rounded-[2rem] bg-[#101010] px-6 py-16 sm:px-10 md:py-24 lg:py-32 text-center">
        {/* Label */}
        <p className="text-primary text-[10px] sm:text-xs tracking-wide mb-8 md:mb-12">
          AI video generation
        </p>

        {/* Heading with italic serif accent */}
        <WordsPullUpMultiStyle
          segments={[
            { text: "Axel is a", className: "font-normal" },
            { text: "node-based platform", className: "italic font-serif" },
            {
              text: "for creating, extending, and chaining AI-powered videos.",
              className: "font-normal",
            },
          ]}
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl max-w-3xl mx-auto leading-[0.95] sm:leading-[0.9]"
          style={{ color: "#E1E0CC" }}
        />

        {/* Scroll-linked character reveal */}
        <div className="mt-12 md:mt-16">
          <ScrollRevealText
            text="Connect nodes on a visual canvas to build complex workflows. Enhance prompts with AI, maintain character consistency through face embeddings, and extend your videos seamlessly up to 20x. Everything you need to create professional AI-generated videos in minutes."
            className="text-[#DEDBC8] text-xs sm:text-sm md:text-base max-w-2xl mx-auto"
          />
        </div>
      </div>
    </section>
  );
}
