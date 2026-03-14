'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import BottomNav from './BottomNav';
import { useSubscription } from '@/hooks/useSubscription';
import { useLocalAuth } from '@/hooks/useLocalAuth';

function SubscriptionBanner() {
  const sub = useSubscription();
  const router = useRouter();
  const pathname = usePathname();

  // Don't show on subscription or login pages
  if (pathname === '/subscription' || pathname === '/login' || pathname.startsWith('/api/')) return null;
  if (sub.status !== 'expired') return null;

  return (
    <div className="max-w-lg mx-auto">
      <div
        className={`mx-4 mt-2 px-4 py-3 rounded-xl flex items-center gap-3 ${
          sub.isReadOnly
            ? 'bg-red-400/10 border border-red-400/30'
            : 'bg-yellow-400/10 border border-yellow-400/30'
        }`}
      >
        <svg className={`w-5 h-5 flex-shrink-0 ${sub.isReadOnly ? 'text-red-400' : 'text-yellow-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium ${sub.isReadOnly ? 'text-red-400' : 'text-yellow-400'}`}>
            {sub.isReadOnly
              ? 'Subscription expired — Read-only mode'
              : 'Subscription expired — Renew soon'}
          </p>
          <p className="text-xs text-white/60">
            {sub.isReadOnly
              ? 'You can view your data but cannot make changes.'
              : 'Your grace period is ending. Renew to keep editing.'}
          </p>
        </div>
        <button
          onClick={() => router.push('/subscription')}
          className="px-3 py-1.5 bg-gradient-to-r from-gold-dim to-gold text-white rounded-lg text-xs font-medium flex-shrink-0"
        >
          Renew
        </button>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useLocalAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  // Safety timeout: never stay on splash screen longer than 1.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!checked) {
        setChecked(true);
        if (pathname !== '/login' && pathname !== '/privacy' && pathname !== '/delete-account') {
          router.replace('/login');
        }
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [checked, pathname, router]);

  useEffect(() => {
    if (loading) return;
    // Don't redirect if already on login page, auth callback, or public pages
    if (pathname === '/login' || pathname.startsWith('/api/auth') || pathname === '/privacy' || pathname === '/delete-account') {
      setChecked(true);
      return;
    }
    // If local user exists (from hook state or localStorage directly), allow through
    if (user) {
      setChecked(true);
      return;
    }
    // Double-check localStorage directly in case hook state hasn't caught up
    if (typeof window !== 'undefined' && localStorage.getItem('sm_user')) {
      setChecked(true);
      return;
    }
    // If user previously skipped login (legacy), allow through
    if (typeof window !== 'undefined' && localStorage.getItem('sm_skip_login')) {
      setChecked(true);
      return;
    }
    // Otherwise redirect to login
    router.replace('/login');
  }, [loading, user, pathname, router]);

  // Show minimal splash screen while loading (max 3 seconds)
  // Small centered icon like WhatsApp/Facebook - professional & clean
  if (!checked && loading) {
    return (
      <div className="min-h-screen bg-royal-bg flex flex-col items-center justify-center">
        <div className="flex-1 flex items-center justify-center">
          <img src="/splash-icon.png" alt="Stitch Manager" className="w-16 h-16 drop-shadow-md" />
        </div>
        <p className="pb-6 text-[11px] text-white/30 tracking-wide">from <span className="font-semibold text-white/40">TECKMAKE</span></p>
      </div>
    );
  }

  // Login, privacy, and delete-account pages get no nav
  if (pathname === '/login' || pathname === '/privacy' || pathname === '/delete-account') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-royal-bg">
      <SubscriptionBanner />
      <main className="max-w-lg mx-auto pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
