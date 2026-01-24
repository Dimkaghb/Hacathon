"use client";

import Navigation from "@/components/landing/Navigation";
import HeroSection from "@/components/landing/HeroSection";
import AboutSection from "@/components/landing/AboutSection";
import QuoteSection from "@/components/landing/QuoteSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ProcessSection from "@/components/landing/ProcessSection";
import FAQSection from "@/components/landing/FAQSection";
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
      <QuoteSection quote="At Axel, we excel in creating AI-powered videos that not only capture attention but also maintain character consistency. We leverage cutting-edge technology including Google Veo 3.1 and advanced face embeddings to produce visually stunning, professional videos." />
      <CTASection />
    </div>
  );
}
