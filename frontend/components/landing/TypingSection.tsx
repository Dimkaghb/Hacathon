"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function TypingSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const text = "At Axel, we excel in creating AI-powered videos that not only capture attention but also maintain character consistency. We leverage cutting-edge technology including Google Veo 3.1 and advanced face embeddings to produce visually stunning, professional videos.";

  const words = text.split(" ");

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const child = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.1,
      },
    },
  };

  return (
    <section className="w-full bg-[#0a0a0a] px-6 py-24 md:px-12" ref={ref}>
      <div className="mx-auto max-w-[1440px]">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={container}
        >
          <motion.p className="text-2xl md:text-3xl lg:text-4xl font-light leading-relaxed text-[#ededed]/90">
            {words.map((word, index) => (
              <motion.span
                key={index}
                variants={child}
                className="inline-block mr-2"
              >
                {word}
              </motion.span>
            ))}
          </motion.p>
          
          {/* Blinking cursor */}
          <motion.span
            className="inline-block w-1 h-8 md:h-10 bg-white ml-1 align-middle"
            animate={{
              opacity: [1, 1, 0, 0],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              repeatDelay: 0,
            }}
          />
        </motion.div>
      </div>
    </section>
  );
}
