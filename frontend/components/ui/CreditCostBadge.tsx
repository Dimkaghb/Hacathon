"use client";

import React from "react";

export function CreditCostBadge({ credits }: { credits: number }) {
  if (credits === 0) return null;

  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 bg-[#1a1a1a] px-1.5 py-0.5 rounded-full">
      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
      {credits}
    </span>
  );
}
