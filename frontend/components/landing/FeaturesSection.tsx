"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

export default function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const features = [
    {
      title: "Node-Based Editor",
      description: "Visual workflow canvas like Figma",
      image: "/node.png",
    },
    {
      title: "Video Extensions",
      description: "Extend videos seamlessly up to 20x",
      image: "/extention.png",
    },
    {
      title: "Character Consistency",
      description: "Facial vector embedding for same character across videos",
      image: "/consistency.jpg",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  return (
    <section id="features" className="w-full bg-[#0a0a0a] px-6 py-24 md:px-12" ref={ref}>
      <div className="mx-auto max-w-[1440px] flex flex-col gap-12">
        <motion.div 
          className="flex flex-col gap-6 md:flex-row md:justify-between md:items-end"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-2xl">
            <motion.h3 
              className="text-sm font-medium uppercase tracking-wider text-gray-400 mb-4"
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Platform Features
            </motion.h3>
            <motion.p 
              className="text-xl md:text-2xl font-light text-[#ededed]/80"
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Everything you need to create professional AI-generated videos. Build workflows, maintain consistency, and generate unlimited content.
            </motion.p>
          </div>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index} 
              className="group relative flex flex-col gap-4"
              variants={itemVariants}
            >
              <motion.div 
                className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-gray-900"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </motion.div>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-medium">{feature.title}</h4>
                  <p className="text-sm text-gray-400 mt-1">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
