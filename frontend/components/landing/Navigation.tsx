"use client";

import Link from "next/link";

export default function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12 bg-gradient-to-b from-black/50 to-transparent backdrop-blur-sm">
      <Link href="/" className="text-2xl font-bold tracking-tight hover:opacity-70 transition-opacity">
        Axel
      </Link>
      <div className="hidden gap-8 text-sm font-medium opacity-90 md:flex items-center">
        <Link href="#features" className="hover:opacity-70 transition-opacity">Features</Link>
        <Link href="#process" className="hover:opacity-70 transition-opacity">How It Works</Link>
        <Link href="#faq" className="hover:opacity-70 transition-opacity">FAQ</Link>
        <Link 
          href="/main"
          className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-200"
        >
          Launch Canvas
        </Link>
      </div>
      <Link 
        href="/main"
        className="md:hidden inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-gray-200"
      >
        Launch
      </Link>
    </nav>
  );
}
