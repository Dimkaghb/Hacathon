"use client";

import Navigation from "@/components/landing/Navigation";
import HeroSection from "@/components/landing/HeroSection";
import AboutSection from "@/components/landing/AboutSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ProcessSection from "@/components/landing/ProcessSection";
import FAQSection from "@/components/landing/FAQSection";
import TypingSection from "@/components/landing/TypingSection";
import CTASection from "@/components/landing/CTASection";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-white selection:bg-white/20">
      <Navigation />
      <HeroSection />
      <AboutSection />
      <FeaturesSection />
      <ProcessSection />
      <FAQSection />
      <TypingSection />
      <CTASection />
    </div>
  );
}
