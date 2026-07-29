"use client";

import Preloader from "@/components/landing/Preloader";
import Navigation from "@/components/landing/Navigation";
import HeroSection from "@/components/landing/HeroSection";
import AboutSection from "@/components/landing/AboutSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ProcessSection from "@/components/landing/ProcessSection";
import FAQSection from "@/components/landing/FAQSection";
import TypingSection from "@/components/landing/TypingSection";
import CTASection from "@/components/landing/CTASection";
import ContactSection from "@/components/landing/ContactSection";

export default function Home() {
  return (
    <div className="landing-page min-h-screen w-full bg-black text-white selection:bg-white/20">
      <Preloader />
      <Navigation />
      <HeroSection />
      <AboutSection />
      <FeaturesSection />
      <ProcessSection />
      <FAQSection />
      <TypingSection />
      <ContactSection />
      <CTASection />
    </div>
  );
}
