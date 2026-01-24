"use client";

import Image from "next/image";
import Link from "next/link";

export default function AboutSection() {
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
        
        <div className="relative h-[400px] md:h-[500px] lg:h-[600px] flex-1 overflow-hidden rounded-2xl">
          <Image
            src="https://framerusercontent.com/images/KbjJDzXJGXQmextyD2imXP0pn8.webp"
            alt="AI video generation workflow"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </div>
    </section>
  );
}
