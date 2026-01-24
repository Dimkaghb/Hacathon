"use client";

import Link from "next/link";

export default function ExpertiseSection() {
  return (
    <section className="w-full bg-[#0a0a0a] px-6 py-24 md:px-12">
      <div className="mx-auto max-w-[1440px]">
        <h3 className="text-sm font-medium uppercase tracking-wider text-gray-400 mb-8">Expertise</h3>
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
          <p className="text-lg md:text-xl font-light text-[#ededed]/80 flex-1 leading-relaxed">
            We specialize in AI video generation using cutting-edge technology. From node-based workflow editors to character consistency through face embeddings, our platform delivers professional results. Powered by Google Veo 3.1, we enable real-time collaboration, seamless video extensions, and unlimited creative possibilities. Each project leverages our deep understanding of AI video generation and workflow optimization.
          </p>
          <div className="hidden lg:block w-px bg-white/10 self-stretch" />
          <div className="lg:w-1/4">
            <Link 
              href="/main"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white hover:text-black"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
