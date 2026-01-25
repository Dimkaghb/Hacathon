"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function ExpertiseSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="w-full bg-[#0a0a0a] px-6 py-24 md:px-12" ref={ref}>
      <div className="mx-auto max-w-[1440px]">
        <motion.h3 
          className="text-sm font-medium uppercase tracking-wider text-gray-400 mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
        >
          Expertise
        </motion.h3>
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
          <motion.p 
            className="text-lg md:text-xl font-light text-[#ededed]/80 flex-1 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            We specialize in AI video generation using cutting-edge technology. From node-based workflow editors to character consistency through face embeddings, our platform delivers professional results. Powered by Google Veo 3.1, we enable real-time collaboration, seamless video extensions, and unlimited creative possibilities. Each project leverages our deep understanding of AI video generation and workflow optimization.
          </motion.p>
          <motion.div 
            className="hidden lg:block w-px bg-white/10 self-stretch"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={isInView ? { opacity: 1, scaleY: 1 } : { opacity: 0, scaleY: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{ originY: 0 }}
          />
          <motion.div 
            className="lg:w-1/4"
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link 
              href="/main"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white hover:text-black hover:scale-105"
            >
              Get Started
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
