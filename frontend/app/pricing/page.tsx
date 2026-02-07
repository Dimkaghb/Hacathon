"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useSubscription } from "@/lib/contexts/SubscriptionContext";
import { CREDIT_COSTS } from "@/lib/types/subscription";
import Navigation from "@/components/landing/Navigation";
import BackgroundGif from "@/components/landing/BackgroundGif";

export default function PricingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { hasActiveSubscription, startTrial, createCheckout, subscription } = useSubscription();

  const handleStartTrial = async () => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/pricing");
      return;
    }
    const success = await startTrial();
    if (success) {
      router.push("/main");
    }
  };

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/pricing");
      return;
    }
    const url = await createCheckout();
    if (url) {
      window.location.href = url;
    }
  };

  const handleGoToApp = () => {
    router.push("/main");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
      {/* Video Background */}
      <BackgroundGif speed={0.5} />

      {/* Navigation */}
      <Navigation />

      <div className="max-w-6xl mx-auto px-6 py-32 relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-5xl font-bold mb-4 tracking-tight">Pricing</h1>
          <p className="text-gray-500 text-base max-w-lg mx-auto">
            Start with a free trial. Scale as you grow.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-24">
          {/* Pro Plan */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 relative hover:bg-white/[0.07] transition-all duration-300">
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-2 text-white">Pro</h2>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-bold tracking-tight text-white">$29</span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>
              <p className="text-sm text-gray-400">300 credits per month</p>
            </div>

            <div className="space-y-2.5 mb-8 text-sm text-gray-300">
              {[
                "Text & image to video",
                "Video extensions",
                "Character consistency",
                "Face analysis",
                "AI prompt enhancement",
                "720p resolution",
                "Fast & standard models",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-white/60" />
                  {feature}
                </div>
              ))}
            </div>

            {hasActiveSubscription ? (
              <button
                onClick={handleGoToApp}
                className="w-full py-3 bg-white/5 text-gray-400 rounded-lg font-medium text-sm border border-white/10"
              >
                Current Plan
              </button>
            ) : subscription?.is_trial === false && subscription?.status ? (
              <button
                onClick={handleSubscribe}
                className="w-full py-3 bg-white hover:bg-white/90 text-black rounded-lg font-medium text-sm transition-colors"
              >
                Subscribe
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleStartTrial}
                  className="w-full py-3 bg-white hover:bg-white/90 text-black rounded-lg font-medium text-sm transition-colors"
                >
                  Start Free Trial
                </button>
                <p className="text-xs text-gray-500 text-center">
                  3 days · 50 credits · No card required
                </p>
              </div>
            )}
          </div>

          {/* Enterprise */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl p-8 hover:bg-white/[0.05] transition-all duration-300">
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-2 text-white">Enterprise</h2>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-bold tracking-tight text-white">Custom</span>
              </div>
              <p className="text-sm text-gray-400">Flexible credit allocation</p>
            </div>

            <div className="space-y-2.5 mb-8 text-sm text-gray-300">
              {[
                "Everything in Pro",
                "Priority generation",
                "Dedicated support",
                "API access",
                "Team collaboration",
                "Custom integrations",
                "SLA guarantees",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-white/60" />
                  {feature}
                </div>
              ))}
            </div>

            <a
              href="mailto:hello@axel.ai"
              className="block w-full py-3 text-center bg-white/10 hover:bg-white/15 text-white rounded-lg font-medium text-sm transition-colors border border-white/10"
            >
              Contact Sales
            </a>
          </div>
        </div>

        {/* Credit Costs Table */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-10">Credit Costs</h3>
          <div className="border border-[#1a1a1a] rounded-xl overflow-hidden">
            {[
              { name: "Video Generation (Standard)", credits: CREDIT_COSTS.video_generation_standard },
              { name: "Video Generation (Fast)", credits: CREDIT_COSTS.video_generation_fast },
              { name: "Video Extension (Standard)", credits: CREDIT_COSTS.video_extension_standard },
              { name: "Video Extension (Fast)", credits: CREDIT_COSTS.video_extension_fast },
              { name: "Face Analysis", credits: CREDIT_COSTS.face_analysis },
              { name: "Prompt Enhancement", credits: 0 },
            ].map((item, i, arr) => (
              <div
                key={item.name}
                className={`flex items-center justify-between px-6 py-4 ${
                  i < arr.length - 1 ? "border-b border-[#1a1a1a]" : ""
                }`}
              >
                <span className="text-sm text-gray-300">{item.name}</span>
                <span className="text-sm font-medium text-white">
                  {item.credits === 0 ? (
                    <span className="text-gray-500">Free</span>
                  ) : (
                    `${item.credits} credits`
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
