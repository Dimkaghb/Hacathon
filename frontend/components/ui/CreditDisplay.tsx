"use client";

import React from "react";
import { useSubscription } from "@/lib/contexts/SubscriptionContext";
import { useSidebar } from "@/components/ui/sidebar";

export function CreditDisplay({ compact = false }: { compact?: boolean }) {
  const { creditsBalance, creditsTotal, isTrial, hasActiveSubscription, loading, subscription } =
    useSubscription();
  const { open: sidebarOpen } = useSidebar();

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

  // Show compact mode when sidebar is collapsed or when explicitly requested
  const showCompact = compact || !sidebarOpen;

  if (showCompact) {
    return (
      <div className="flex items-center justify-center px-2 py-2" title={`${creditsBalance} / ${creditsTotal} credits${isTrial ? ' (trial)' : ''}`}>
        <div className="relative flex items-center justify-center">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span className="absolute -bottom-1 -right-1 text-[9px] font-bold text-white bg-purple-600 rounded-full w-4 h-4 flex items-center justify-center">
            {creditsBalance > 99 ? '99+' : creditsBalance}
          </span>
        </div>
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
