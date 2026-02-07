"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/lib/contexts/SubscriptionContext";

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const { refreshSubscription } = useSubscription();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    refreshSubscription();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push("/main");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [refreshSubscription, router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="text-center max-w-md mx-4">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-green-400"
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
        </div>

        <h1 className="text-2xl font-bold mb-2">Welcome to Axel Pro!</h1>
        <p className="text-gray-400 mb-8">
          Your subscription is active. You now have 300 credits to create amazing AI videos.
        </p>

        <button
          onClick={() => router.push("/main")}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
        >
          Start Creating
        </button>

        <p className="text-xs text-gray-500 mt-4">
          Redirecting in {countdown} seconds...
        </p>
      </div>
    </div>
  );
}
