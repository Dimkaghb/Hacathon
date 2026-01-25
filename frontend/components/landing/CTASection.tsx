"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section 
      className="relative w-full h-[300px] flex items-center justify-center px-6 text-center overflow-hidden"
      ref={ref}
    >
      <Image 
        src="https://framerusercontent.com/images/BhlGrMWa8BjbLVs1247F4KgYYA.jpg"
        alt="Background"
        fill
        className="object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
      
      <div className="relative z-10 max-w-3xl flex flex-col gap-10 items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={isInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Link 
            href="/main"
            className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition-colors hover:bg-gray-200 hover:scale-105"
          >
            Get Started
          </Link>
        </motion.div>
        
        <motion.div 
          className="absolute bottom-8 text-white text-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Axel 2026
        </motion.div>
      </div>
    </section>
  );
}
