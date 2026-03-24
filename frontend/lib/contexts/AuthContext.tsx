"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, subscriptionApi, tokenStorage } from '../api';

// Proactive refresh: refresh token 10 minutes before expiry (every 90 minutes for 120-min tokens)
const REFRESH_INTERVAL_MS = 90 * 60 * 1000;

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = setInterval(async () => {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) return;
      try {
        // apiFetch handles refresh internally; just hit /me to trigger if needed
        await authApi.getMe();
      } catch {
        // Will be handled by apiFetch's 401 → refresh logic
      }
    }, REFRESH_INTERVAL_MS);
  }, []);

  const checkAuth = useCallback(async () => {
    const token = tokenStorage.getAccessToken();
    const refreshToken = tokenStorage.getRefreshToken();

    if (!token && !refreshToken) {
      setLoading(false);
      return;
    }

    try {
      const userData = await authApi.getMe();
      setUser(userData);
      startRefreshTimer();
    } catch (error) {
      // getMe failed — apiFetch already tried refresh internally; clear if still failing
      tokenStorage.clearTokens();
      setUser(null);
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  }, [startRefreshTimer]);

  useEffect(() => {
    checkAuth();
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      await authApi.login(email, password);
      const userData = await authApi.getMe();
      setUser(userData);
      startRefreshTimer();
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }, [startRefreshTimer]);

  const register = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      await authApi.register(email, password);
      const userData = await authApi.getMe();
      setUser(userData);
      startRefreshTimer();
      // Auto-start free trial for new users
      try {
        await subscriptionApi.startTrial();
      } catch (e) {
        console.warn('Trial auto-start failed (may already exist):', e);
      }
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  }, [startRefreshTimer]);

  const logout = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    authApi.logout();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
