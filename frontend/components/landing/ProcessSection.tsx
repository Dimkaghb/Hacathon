"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function ProcessSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const steps = [
    {
      number: "01",
      title: "Upload & Analyze",
      description: "Upload a face image and our AI extracts embeddings to ensure character consistency across all your videos. The system analyzes facial features and stores them for future use.",
    },
    {
      number: "02",
      title: "Create & Enhance",
      description: "Write your video prompt and let our AI enhance it with visual details, camera angles, and temporal descriptions. Get suggestions to improve your prompt for better results.",
    },
    {
      number: "03",
      title: "Generate & Extend",
      description: "Generate videos using Google Veo 3.1 in 720p, 1080p, or 4K. Extend your videos seamlessly up to 20 times, maintaining consistency and quality throughout.",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  return (
    <section id="process" className="w-full bg-[#0a0a0a] px-6 py-24 md:px-12" ref={ref}>
      <div className="mx-auto max-w-[1440px] flex flex-col gap-16">
        <motion.div 
          className="max-w-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h3 
            className="text-sm font-medium uppercase tracking-wider text-gray-400 mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            How It Works
          </motion.h3>
          <motion.p 
            className="text-xl md:text-2xl font-light text-[#ededed]/80"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Our platform guides you through three simple steps to create professional AI-generated videos with character consistency.
          </motion.p>
        </motion.div>

        <motion.div 
          className="flex flex-col gap-8"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {steps.map((step, index) => (
            <motion.div 
              key={step.number} 
              className="border-t border-white/10 pt-8 flex flex-col md:flex-row gap-8 md:gap-32"
              variants={itemVariants}
            >
              <motion.span 
                className="text-sm font-mono text-gray-500"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.3 }}
              >
                {step.number}
              </motion.span>
              <div className="flex-1">
                <motion.h4 
                  className="text-2xl font-serif mb-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.3 }}
                >
                  {step.title}
                </motion.h4>
                <motion.p 
                  className="text-gray-400 max-w-xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  transition={{ duration: 0.5, delay: 0.7 + index * 0.3 }}
                >
                  {step.description}
                </motion.p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
