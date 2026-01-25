"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function FAQSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  
  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      question: "How does video generation work?",
      answer: "Axel uses a node-based workflow where you connect image nodes, prompt nodes, and video nodes on a visual canvas. When you connect a prompt to an image, our system generates a video using Google Veo 3.1, maintaining character consistency through face embeddings.",
    },
    {
      question: "What video formats are supported?",
      answer: "We support 720p, 1080p, and 4K resolutions. Videos can be generated in 4, 6, or 8 second durations. Extensions are available in 720p and can be chained up to 20 times.",
    },
    {
      question: "Can I extend existing videos?",
      answer: "Yes! You can extend any generated video up to 20 times. Each extension seamlessly continues from where the previous video ended, maintaining visual consistency and character appearance.",
    },
    {
      question: "How long does generation take?",
      answer: "Video generation typically takes between 10 seconds to 6 minutes, depending on the resolution and complexity. You'll see real-time progress updates through our WebSocket connection.",
    },
    {
      question: "Is there character consistency?",
      answer: "Absolutely. When you upload a face image, our system extracts facial embeddings using advanced AI. These embeddings ensure the same character appears consistently across all generated videos, maintaining their appearance, features, and identity.",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <section id="faq" className="w-full bg-[#0a0a0a] px-6 py-24 md:px-12" ref={ref}>
      <div className="mx-auto max-w-[1440px]">
        <motion.h3 
          className="text-sm font-medium uppercase tracking-wider text-gray-400 mb-12"
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
        >
          Q&A
        </motion.h3>
        <motion.div 
          className="flex flex-col gap-4"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {faqs.map((faq, index) => (
            <motion.div 
              key={index} 
              className="border-b border-white/10 pb-4 cursor-pointer"
              onClick={() => handleToggle(index)}
              variants={itemVariants}
              whileHover={{ x: 5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-between items-center text-xl font-medium">
                <span>{faq.question}</span>
                <motion.span 
                  className="text-2xl"
                  animate={{ 
                    rotate: openIndex === index ? 45 : 0 
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  +
                </motion.span>
              </div>
              <motion.div
                className="overflow-hidden"
                initial={false}
                animate={{
                  height: openIndex === index ? "auto" : 0,
                  opacity: openIndex === index ? 1 : 0,
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <p className="mt-4 text-gray-400">{faq.answer}</p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
