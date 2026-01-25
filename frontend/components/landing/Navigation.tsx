"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Navigation() {
  return (
    <motion.nav 
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12 bg-gradient-to-b from-black/50 to-transparent backdrop-blur-sm"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Link href="/" className="text-2xl font-bold tracking-tight hover:opacity-70 transition-opacity">
          Axel
        </Link>
      </motion.div>
      
      <motion.div 
        className="hidden gap-8 text-sm font-medium opacity-90 md:flex items-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Link href="#features" className="hover:opacity-70 transition-opacity">Features</Link>
        <Link href="#process" className="hover:opacity-70 transition-opacity">How It Works</Link>
        <Link href="#faq" className="hover:opacity-70 transition-opacity">FAQ</Link>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link 
            href="/main"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-200"
          >
            Launch Canvas
          </Link>
        </motion.div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Link 
          href="/main"
          className="md:hidden inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-gray-200"
        >
          Launch
        </Link>
      </motion.div>
    </motion.nav>
  );
}
