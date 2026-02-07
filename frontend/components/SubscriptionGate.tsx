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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-md w-full">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            {isExpired ? (
              <>
                <h2 className="text-2xl font-medium text-white mb-3">
                  {hadTrial ? "Trial Ended" : "Subscription Expired"}
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {hadTrial
                    ? "Your free trial has ended. Subscribe to continue creating AI-powered videos."
                    : "Your subscription has expired. Resubscribe to continue."}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-medium text-white mb-3">
                  Start Creating
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Get started with a 3-day free trial. 50 credits included — enough for 5 video generations.
                </p>
              </>
            )}
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            {!isExpired && !hadTrial && (
              <button
                onClick={handleStartTrial}
                className="w-full py-3.5 px-4 bg-white text-black rounded-full font-medium hover:bg-gray-100 transition-all"
              >
                Start Free Trial
              </button>
            )}

            <button
              onClick={handleSubscribe}
              className={`w-full py-3.5 px-4 rounded-full font-medium transition-all ${
                isExpired || hadTrial
                  ? "bg-white text-black hover:bg-gray-100"
                  : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
              }`}
            >
              Subscribe — $29/month
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              300 credits per month · Cancel anytime
            </p>
          </div>
        </div>
      </div>
      <div className="pointer-events-none opacity-20 blur-sm">{children}</div>
    </div>
  );
}
