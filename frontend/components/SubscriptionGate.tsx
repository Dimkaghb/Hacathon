"use client";

import React from "react";
import { useSubscription } from "@/lib/contexts/SubscriptionContext";
import { useAuth } from "@/lib/contexts/AuthContext";

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { hasActiveSubscription, loading, subscription, startTrial, createCheckout } =
    useSubscription();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated || loading) {
    return <>{children}</>;
  }

  if (hasActiveSubscription) {
    return <>{children}</>;
  }

  const isExpired = subscription?.status === "expired" || subscription?.status === "revoked";
  const hadTrial = subscription?.is_trial;

  const handleStartTrial = async () => {
    await startTrial();
  };

  const handleSubscribe = async () => {
    const url = await createCheckout();
    if (url) {
      window.location.href = url;
    }
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-8 max-w-md mx-4 text-center">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>

          {isExpired ? (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">
                {hadTrial ? "Trial Expired" : "Subscription Expired"}
              </h2>
              <p className="text-gray-400 mb-6">
                {hadTrial
                  ? "Your free trial has ended. Subscribe to continue creating AI videos."
                  : "Your subscription has expired. Resubscribe to continue."}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">
                Start Creating AI Videos
              </h2>
              <p className="text-gray-400 mb-6">
                Get started with a 3-day free trial. 50 credits included — enough for 5 video
                generations.
              </p>
            </>
          )}

          <div className="space-y-3">
            {!isExpired && !hadTrial && (
              <button
                onClick={handleStartTrial}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Start Free Trial
              </button>
            )}

            <button
              onClick={handleSubscribe}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                isExpired || hadTrial
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "bg-[#1a1a1a] hover:bg-[#222] text-gray-300 border border-[#333]"
              }`}
            >
              Subscribe — $29/month
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            300 credits/month · Cancel anytime
          </p>
        </div>
      </div>
      <div className="pointer-events-none opacity-30">{children}</div>
    </div>
  );
}
