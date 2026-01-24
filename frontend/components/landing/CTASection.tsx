"use client";

import Image from "next/image";
import Link from "next/link";

export default function CTASection() {
  return (
    <section className="relative w-full h-[300px] flex items-center justify-center px-6 text-center overflow-hidden">
      <Image 
        src="https://framerusercontent.com/images/BhlGrMWa8BjbLVs1247F4KgYYA.jpg"
        alt="Background"
        fill
        className="object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
      
      <div className="relative z-10 max-w-3xl flex flex-col gap-10 items-center justify-center h-full">
        <Link 
          href="/main"
          className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition-colors hover:bg-gray-200"
        >
          Get Started
        </Link>
        
        {/* Footer */}
        <div className="absolute bottom-8 text-white text-sm">
          Axel 2026
        </div>
      </div>
    </section>
  );
}
