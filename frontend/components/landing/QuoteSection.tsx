"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface QuoteSectionProps {
  quote: string;
  author?: string;
  role?: string;
}

export default function QuoteSection({ quote, author, role }: QuoteSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section 
      className="flex min-h-[40vh] w-full items-center justify-center bg-[#0a0a0a] px-6 py-16 md:py-20"
      ref={ref}
    >
      <div className="max-w-6xl text-center">
        <motion.h2 
          className="font-serif text-3xl font-normal leading-snug text-[#ededed] md:text-5xl lg:text-6xl"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {quote}
        </motion.h2>
        {author && (
          <motion.div 
            className="mt-8 flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="font-medium text-lg text-[#ededed]">{author}</div>
            {role && <div className="text-sm text-gray-400">{role}</div>}
          </motion.div>
        )}
      </div>
    </section>
  );
}
