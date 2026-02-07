"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import CurvedLoop from "./CurvedLoop";

export default function ContactSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section
      ref={ref}
      className="relative w-full bg-transparent overflow-hidden"
    >
      {/* Zig-zag wave loop fills the section background */}
      <div className="absolute inset-0 z-0 opacity-20">
        <CurvedLoop
          marqueeText="Contact Us \u2022 Get In Touch \u2022 Say Hello \u2022 "
          speed={1.5}
          curveAmount={200}
          waves={3}
          direction="left"
          className="fill-white"
          interactive={false}
        />
      </div>

      {/* Form overlaid on top with glass bg */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <motion.div
          className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8 md:p-12"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Contact Us
          </h2>
          <p className="text-white/50 text-center mb-10 text-sm">
            Have a question or want to collaborate? We&apos;d love to hear from you.
          </p>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Name"
                className="flex-1 rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 transition-colors"
              />
              <input
                type="email"
                placeholder="Email"
                className="flex-1 rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 transition-colors"
              />
            </div>
            <textarea
              placeholder="Your message..."
              rows={4}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 transition-colors resize-none"
            />
            <button
              type="submit"
              className="self-center rounded-full bg-white px-8 py-3 text-sm font-bold text-black transition-all hover:bg-gray-200 hover:scale-105"
            >
              Send Message
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
