"use client";

import React from "react";
import { useSubscription } from "@/lib/contexts/SubscriptionContext";

export function CreditDisplay({ compact = false }: { compact?: boolean }) {
  const { creditsBalance, creditsTotal, isTrial, hasActiveSubscription, loading, subscription } =
    useSubscription();

  if (loading || !hasActiveSubscription) {
    return null;
  }

  const percentage = creditsTotal > 0 ? (creditsBalance / creditsTotal) * 100 : 0;
  const barColor =
    creditsBalance < 10
      ? "bg-red-500"
      : creditsBalance < 50
        ? "bg-amber-500"
        : "bg-purple-500";

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <span>
          {creditsBalance}
          {isTrial && " (trial)"}
        </span>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Credits
          {isTrial && (
            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">
              Trial
            </span>
          )}
          {subscription?.status === "canceled" && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
              Canceling
            </span>
          )}
        </span>
        <span className="text-xs text-gray-300 font-medium">
          {creditsBalance} / {creditsTotal}
        </span>
      </div>
      <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
