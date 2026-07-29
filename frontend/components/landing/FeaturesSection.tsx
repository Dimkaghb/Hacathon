"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { IconCheck, IconArrowRight } from "@tabler/icons-react";
import { WordsPullUpMultiStyle } from "./TextAnimations";

const CARD_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const featureCards = [
  {
    number: "01",
    title: "Node-Based Editor.",
    icon: "/node.png",
    items: [
      "Visual workflow canvas like Figma",
      "Drag-and-drop prompt, image and video nodes",
      "Connect nodes to chain generations",
      "Real-time job status on every node",
    ],
  },
  {
    number: "02",
    title: "Video Extensions.",
    icon: "/extention.png",
    items: [
      "Extend videos seamlessly up to 20x",
      "Fast and standard generation modes",
      "Chain extensions into full scenes",
    ],
  },
  {
    number: "03",
    title: "Character Consistency.",
    icon: "/consistency.jpg",
    items: [
      "Facial vector embeddings",
      "Same character across every video",
      "Wardrobe presets per character",
    ],
  },
];

function FeatureCard({
  card,
  index,
  isInView,
}: {
  card: (typeof featureCards)[number];
  index: number;
  isInView: boolean;
}) {
  return (
    <motion.div
      className="flex flex-col rounded-2xl bg-[#212121] p-5 sm:p-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: CARD_EASE }}
    >
      <div className="relative w-10 h-10 sm:w-12 sm:h-12 overflow-hidden rounded">
        <Image src={card.icon} alt={card.title} fill className="object-cover" />
      </div>

      <h4 className="mt-5 text-base sm:text-lg" style={{ color: "#E1E0CC" }}>
        {card.title}{" "}
        <span className="text-gray-500 text-sm">({card.number})</span>
      </h4>

      <ul className="mt-4 flex flex-col gap-3 flex-1">
        {card.items.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <IconCheck size={16} className="text-primary mt-0.5 shrink-0" />
            <span className="text-sm text-gray-400">{item}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/main"
        className="group mt-6 inline-flex items-center gap-1.5 text-sm text-primary hover:text-white transition-colors"
      >
        Learn more
        <IconArrowRight
          size={16}
          className="-rotate-45 transition-transform group-hover:rotate-0"
        />
      </Link>
    </motion.div>
  );
}

export default function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="features"
      className="relative min-h-screen w-full bg-black px-4 py-20 md:px-6 md:py-28"
      ref={ref}
    >
      {/* Subtle noise background */}
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.15]" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-12 md:gap-16">
        {/* Header */}
        <div className="text-center">
          <WordsPullUpMultiStyle
            segments={[
              {
                text: "Everything you need to create professional AI videos.",
                className: "font-normal",
              },
              {
                text: "Built on a visual canvas. Powered by Veo 3.1.",
                className: "font-normal text-gray-500",
              },
            ]}
            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl max-w-4xl mx-auto"
            style={{ color: "#E1E0CC" }}
          />
        </div>

        {/* 4-column card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-2 md:gap-1 lg:h-[480px]">
          {/* Card 1 — video */}
          <motion.div
            className="relative min-h-[320px] overflow-hidden rounded-2xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, ease: CARD_EASE }}
          >
            <video
              src="/heroVideo.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <p
              className="absolute bottom-5 left-5 text-base sm:text-lg"
              style={{ color: "#E1E0CC" }}
            >
              Your creative canvas.
            </p>
          </motion.div>

          {/* Cards 2-4 — features */}
          {featureCards.map((card, i) => (
            <FeatureCard
              key={card.number}
              card={card}
              index={i + 1}
              isInView={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
