"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CURTAIN_EASE: [number, number, number, number] = [0.76, 0, 0.24, 1];
const LETTER_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Total time the preloader stays on screen before the curtain lifts. */
export const PRELOADER_DURATION = 1.5;

export default function Preloader() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => {
      setShow(false);
      document.body.style.overflow = "";
    }, PRELOADER_DURATION * 1000);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, []);

  const letters = "Axel".split("");

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.8, ease: CURTAIN_EASE }}
        >
          <div
            className="relative flex text-6xl sm:text-7xl md:text-8xl font-medium tracking-[-0.05em]"
            style={{ color: "#E1E0CC" }}
          >
            {letters.map((letter, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.6,
                  delay: 0.15 + i * 0.08,
                  ease: LETTER_EASE,
                }}
              >
                {letter}
              </motion.span>
            ))}
            <motion.span
              className="absolute top-[0.1em] -right-[0.45em] text-[0.35em]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              *
            </motion.span>
          </div>

          <motion.p
            className="mt-4 text-[10px] sm:text-xs tracking-[0.3em] uppercase text-primary/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            AI video generation
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
