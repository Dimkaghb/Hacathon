"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const navItems = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#process" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
];

export default function Navigation() {
  return (
    <motion.nav
      className="fixed top-0 left-1/2 z-50 -translate-x-1/2"
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="flex items-center gap-3 sm:gap-6 md:gap-12 lg:gap-14 bg-black rounded-b-2xl md:rounded-b-3xl px-4 py-2 md:px-8 md:py-3">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="nav-link whitespace-nowrap text-[10px] sm:text-xs md:text-sm"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/main"
          className="whitespace-nowrap text-[10px] sm:text-xs md:text-sm font-bold text-primary hover:text-white transition-colors"
        >
          Launch Canvas
        </Link>
      </div>
    </motion.nav>
  );
}
