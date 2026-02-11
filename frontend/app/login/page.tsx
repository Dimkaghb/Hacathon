"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import Dither from '@/components/Dither';
import { authApi } from '@/lib/api';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, register, isAuthenticated, checkAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const getRedirectUri = () => {
    return window.location.origin + '/login';
  };

  // Handle Google OAuth callback — Google redirects here with ?code=xxx
  const handleGoogleCallback = useCallback(async (code: string) => {
    setLoading(true);
    setError('');
    try {
      await authApi.googleAuth(code, getRedirectUri());
      await checkAuth();
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError('Google authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [checkAuth, router]);

  useEffect(() => {
    const code = searchParams.get('code');
    const authError = searchParams.get('error');

    if (authError) {
      setError(authError);
      // Clean URL
      window.history.replaceState({}, '', '/login');
      return;
    }

    if (code) {
      // Clean URL immediately so we don't re-process
      window.history.replaceState({}, '', '/login');
      handleGoogleCallback(code);
    }
  }, [searchParams, handleGoogleCallback]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = isRegister
        ? await register(email, password)
        : await login(email, password);

      if (success) {
        router.push('/dashboard');
      } else {
        setError(isRegister ? 'Registration failed. Email may already be in use.' : 'Invalid email or password.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Redirect directly to Google — Google redirects back to /login with ?code=xxx
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: getRedirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a]">
      {/* Left side Dither - hidden on mobile */}
      <div className="w-full hidden md:inline-block relative overflow-hidden">
        <Dither
          waveColor={[0.5, 0.5, 0.5]}
          disableAnimation={false}
          enableMouseInteraction={false}
          mouseRadius={0.3}
          colorNum={18.7}
          waveAmplitude={0.22}
          waveFrequency={2.5}
          waveSpeed={0.04}
        />
      </div>

      {/* Right side form - Dark mode */}
      <div className="w-full flex flex-col items-center justify-center bg-[#0a0a0a] px-6 relative">
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12.5 5L7.5 10L12.5 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>
        <form onSubmit={handleSubmit} className="md:w-96 w-80 flex flex-col items-center justify-center">
          {/* Logo */}
          

          <h2 className="text-4xl text-white font-medium">
            {isRegister ? 'Sign up' : 'Sign in'}
          </h2>
          <p className="text-sm text-gray-400 mt-3">
            {isRegister
              ? 'Create your account to get started'
              : 'Welcome back! Please sign in to continue'}
          </p>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full mt-8 bg-white/5 border border-white/10 flex items-center justify-center h-12 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img
              src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/login/googleLogo.svg"
              alt="googleLogo"
            />
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 w-full my-5">
            <div className="w-full h-px bg-white/10"></div>
            <p className="w-full text-nowrap text-sm text-gray-400">or {isRegister ? 'sign up' : 'sign in'} with email</p>
            <div className="w-full h-px bg-white/10"></div>
          </div>

          {/* Email Input */}
          <div className="flex items-center w-full bg-transparent border border-white/10 h-12 rounded-full overflow-hidden pl-6 gap-2 focus-within:border-white/30 transition-colors">
            <svg
              width="16"
              height="11"
              viewBox="0 0 16 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0 .55.571 0H15.43l.57.55v9.9l-.571.55H.57L0 10.45zm1.143 1.138V9.9h13.714V1.69l-6.503 4.8h-.697zM13.749 1.1H2.25L8 5.356z"
                fill="#9CA3AF"
              />
            </svg>
            <input
              type="email"
              placeholder="Email id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-transparent text-white placeholder-gray-500 outline-none text-sm w-full h-full"
            />
          </div>

          {/* Password Input */}
          <div className="flex items-center mt-6 w-full bg-transparent border border-white/10 h-12 rounded-full overflow-hidden pl-6 gap-2 focus-within:border-white/30 transition-colors">
            <svg
              width="13"
              height="17"
              viewBox="0 0 13 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13 8.5c0-.938-.729-1.7-1.625-1.7h-.812V4.25C10.563 1.907 8.74 0 6.5 0S2.438 1.907 2.438 4.25V6.8h-.813C.729 6.8 0 7.562 0 8.5v6.8c0 .938.729 1.7 1.625 1.7h9.75c.896 0 1.625-.762 1.625-1.7zM4.063 4.25c0-1.406 1.093-2.55 2.437-2.55s2.438 1.144 2.438 2.55V6.8H4.061z"
                fill="#9CA3AF"
              />
            </svg>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-transparent text-white placeholder-gray-500 outline-none text-sm w-full h-full"
            />
          </div>

          {/* Remember me & Forgot password */}
          {!isRegister && (
            <div className="w-full flex items-center justify-between mt-8 text-gray-400">
              <div className="flex items-center gap-2">
                <input
                  className="h-5 w-5 cursor-pointer"
                  type="checkbox"
                  id="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label className="text-sm cursor-pointer" htmlFor="checkbox">
                  Remember me
                </label>
              </div>
              <a className="text-sm underline hover:text-white transition-colors" href="#">
                Forgot password?
              </a>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-6 w-full p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full h-11 rounded-full text-black bg-white hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Please wait...' : isRegister ? 'Sign Up' : 'Sign In'}
          </button>

          {/* Toggle between login and register */}
          <p className="text-gray-400 text-sm mt-4">
            {isRegister ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError('');
                  }}
                  className="text-white hover:underline font-medium"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError('');
                  }}
                  className="text-white hover:underline font-medium"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
