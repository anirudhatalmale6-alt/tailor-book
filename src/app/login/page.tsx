'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      await signIn('google', { callbackUrl: '/' });
    } catch {
      setLoading(false);
    }
  }

  function handleSkip() {
    localStorage.setItem('sm_skip_login', '1');
    router.replace('/');
  }

  return (
    <div className="min-h-screen bg-royal-bg flex flex-col items-center justify-center px-6">
      {/* Logo / App Name */}
      <div className="text-center mb-10">
        <img src="/logo.png" alt="Stitch Manager" className="w-24 h-24 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Stitch Manager</h1>
        <p className="text-white/60 text-sm">Your tailoring business, organized</p>
      </div>

      {/* Sign In Card */}
      <div className="w-full max-w-sm">
        <div className="bg-royal-card rounded-2xl p-6 shadow-lg border border-royal-border">
          <h2 className="text-lg font-semibold text-white text-center mb-2">Welcome</h2>
          <p className="text-sm text-white/60 text-center mb-6">Sign in to sync your data across devices</p>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white rounded-xl text-gray-800 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>
        </div>

        {/* Skip for now */}
        <div className="mt-4 text-center">
          <button onClick={handleSkip} className="text-sm text-white/40 hover:text-white/60 transition-colors">
            Skip for now — use offline
          </button>
        </div>

        <p className="text-xs text-white/30 text-center mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
