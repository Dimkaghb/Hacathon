"use client";

import { CSSProperties, useRef } from "react";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  MotionValue,
} from "framer-motion";

const PULL_UP_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface WordsPullUpProps {
  text: string;
  className?: string;
  style?: CSSProperties;
  showAsterisk?: boolean;
  delayStart?: number;
}

/**
 * Splits text by spaces; each word slides up (y:20 → 0) with a staggered
 * 0.08s delay once the element scrolls into view.
 */
export function WordsPullUp({
  text,
  className = "",
  style,
  showAsterisk = false,
  delayStart = 0,
}: WordsPullUpProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(" ");

  return (
    <div ref={ref} className={`flex flex-wrap ${className}`} style={style}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="relative inline-block"
          initial={{ y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{
            duration: 0.5,
            delay: delayStart + i * 0.08,
            ease: PULL_UP_EASE,
          }}
        >
          {word}
          {showAsterisk && i === words.length - 1 && (
            <span className="absolute top-[0.65em] -right-[0.3em] text-[0.31em]">
              *
            </span>
          )}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </div>
  );
}

interface TextSegment {
  text: string;
  className?: string;
}

interface WordsPullUpMultiStyleProps {
  segments: TextSegment[];
  className?: string;
  style?: CSSProperties;
}

/**
 * Same pull-up animation as WordsPullUp, but takes styled segments so a
 * sentence can mix normal and italic-serif words.
 */
export function WordsPullUpMultiStyle({
  segments,
  className = "",
  style,
}: WordsPullUpMultiStyleProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const words = segments.flatMap((segment) =>
    segment.text.split(" ").map((word) => ({
      word,
      className: segment.className ?? "",
    }))
  );

  return (
    <div
      ref={ref}
      className={`inline-flex flex-wrap justify-center ${className}`}
      style={style}
    >
      {words.map((item, i) => (
        <motion.span
          key={i}
          className={`inline-block ${item.className}`}
          initial={{ y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: i * 0.08, ease: PULL_UP_EASE }}
        >
          {item.word}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </div>
  );
}

function AnimatedLetter({
  char,
  progress,
  range,
}: {
  char: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.2, 1]);
  return <motion.span style={{ opacity }}>{char}</motion.span>;
}

interface ScrollRevealTextProps {
  text: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Scroll-linked character reveal: each character's opacity transitions
 * from 0.2 to 1 as the paragraph moves through the viewport.
 */
export function ScrollRevealText({
  text,
  className = "",
  style,
}: ScrollRevealTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.2"],
  });
  const chars = text.split("");

  return (
    <p ref={ref} className={className} style={style}>
      {chars.map((char, i) => {
        const charProgress = i / chars.length;
        return (
          <AnimatedLetter
            key={i}
            char={char}
            progress={scrollYProgress}
            range={[
              Math.max(0, charProgress - 0.1),
              Math.min(1, charProgress + 0.05),
            ]}
          />
        );
      })}
    </p>
  );
}
