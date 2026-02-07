"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { subscriptionApi } from "@/lib/api";
import { useAuth } from "./AuthContext";
import type { SubscriptionStatus } from "@/lib/types/subscription";

interface SubscriptionContextType {
  subscription: SubscriptionStatus | null;
  loading: boolean;
  hasActiveSubscription: boolean;
  creditsBalance: number;
  creditsTotal: number;
  isTrial: boolean;
  refreshSubscription: () => Promise<void>;
  startTrial: () => Promise<boolean>;
  createCheckout: () => Promise<string | null>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const status = await subscriptionApi.getStatus();
      setSubscription(status);
    } catch (error) {
      console.error("Failed to fetch subscription status:", error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      fetchSubscription();
    }
  }, [authLoading, fetchSubscription]);

  const refreshSubscription = useCallback(async () => {
    await fetchSubscription();
  }, [fetchSubscription]);

  const startTrial = useCallback(async (): Promise<boolean> => {
    try {
      const result = await subscriptionApi.startTrial();
      setSubscription(result as SubscriptionStatus);
      return true;
    } catch (error) {
      console.error("Failed to start trial:", error);
      return false;
    }
  }, []);

  const createCheckout = useCallback(async (): Promise<string | null> => {
    try {
      const result = await subscriptionApi.createCheckout();
      return result.checkout_url;
    } catch (error) {
      console.error("Failed to create checkout:", error);
      return null;
    }
  }, []);

  const hasActiveSubscription = subscription?.has_subscription ?? false;
  const creditsBalance = subscription?.credits_balance ?? 0;
  const creditsTotal = subscription?.credits_total ?? 0;
  const isTrial = subscription?.is_trial ?? false;

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        hasActiveSubscription,
        creditsBalance,
        creditsTotal,
        isTrial,
        refreshSubscription,
        startTrial,
        createCheckout,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
