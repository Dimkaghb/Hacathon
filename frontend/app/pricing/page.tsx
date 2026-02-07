"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useSubscription } from "@/lib/contexts/SubscriptionContext";
import { CREDIT_COSTS } from "@/lib/types/subscription";

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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navigation */}
      <nav className="border-b border-[#1a1a1a] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => router.push("/")} className="text-xl font-bold">
            Axel
          </button>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <button
                onClick={handleGoToApp}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Go to App
              </button>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Start with a free trial. Scale with credits that match your creative workflow.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-20">
          {/* Pro Plan */}
          <div className="bg-[#141414] border border-purple-500/30 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-6">
              <span className="bg-purple-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                Most Popular
              </span>
            </div>

            <h2 className="text-2xl font-bold mb-1">Pro</h2>
            <p className="text-gray-400 text-sm mb-6">For creators and professionals</p>

            <div className="mb-6">
              <span className="text-4xl font-bold">$29</span>
              <span className="text-gray-400">/month</span>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                "300 credits per month",
                "Text-to-video generation",
                "Image-to-video generation",
                "Video extensions (up to 20 chains)",
                "Character consistency",
                "Face analysis",
                "AI prompt enhancement",
                "720p resolution",
                "Fast & standard models",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                  <svg
                    className="w-4 h-4 text-purple-400 mt-0.5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            {hasActiveSubscription ? (
              <button
                onClick={handleGoToApp}
                className="w-full py-3 bg-[#1a1a1a] text-gray-300 rounded-lg font-medium border border-[#333]"
              >
                Current Plan
              </button>
            ) : subscription?.is_trial === false && subscription?.status ? (
              <button
                onClick={handleSubscribe}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Subscribe Now
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleStartTrial}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  Start 3-Day Free Trial
                </button>
                <p className="text-xs text-gray-500 text-center">
                  50 credits included · No credit card required
                </p>
              </div>
            )}
          </div>

          {/* Enterprise */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-1">Enterprise</h2>
            <p className="text-gray-400 text-sm mb-6">For teams and studios</p>

            <div className="mb-6">
              <span className="text-4xl font-bold">Custom</span>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                "Custom credit allocation",
                "Priority video generation",
                "Dedicated support",
                "API access",
                "Team collaboration",
                "Custom integrations",
                "SLA guarantees",
                "Volume discounts",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                  <svg
                    className="w-4 h-4 text-gray-500 mt-0.5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <a
              href="mailto:hello@axel.ai"
              className="block w-full py-3 text-center bg-[#1a1a1a] hover:bg-[#222] text-gray-300 rounded-lg font-medium border border-[#333] transition-colors"
            >
              Contact Sales
            </a>
          </div>
        </div>

        {/* Credit Costs Table */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-center mb-8">Credit Usage</h3>
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">
                    Operation
                  </th>
                  <th className="text-right text-xs text-gray-400 font-medium px-6 py-3">
                    Credits
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { name: "Video Generation (Standard)", credits: CREDIT_COSTS.video_generation_standard },
                  { name: "Video Generation (Fast)", credits: CREDIT_COSTS.video_generation_fast },
                  { name: "Video Extension (Standard)", credits: CREDIT_COSTS.video_extension_standard },
                  { name: "Video Extension (Fast)", credits: CREDIT_COSTS.video_extension_fast },
                  { name: "Face Analysis", credits: CREDIT_COSTS.face_analysis },
                  { name: "Prompt Enhancement", credits: 0 },
                ].map((item, i) => (
                  <tr key={item.name} className={i < 5 ? "border-b border-[#1a1a1a]" : ""}>
                    <td className="px-6 py-3 text-gray-300">{item.name}</td>
                    <td className="px-6 py-3 text-right text-gray-300">
                      {item.credits === 0 ? (
                        <span className="text-green-400">Free</span>
                      ) : (
                        item.credits
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
