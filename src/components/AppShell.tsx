'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import BottomNav from './BottomNav';
import { useSubscription } from '@/hooks/useSubscription';

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
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    // Don't redirect if already on login page or auth callback
    if (pathname === '/login' || pathname.startsWith('/api/auth')) {
      setChecked(true);
      return;
    }
    // If signed in, allow through
    if (session?.user) {
      setChecked(true);
      return;
    }
    // If user previously skipped login, allow through
    if (typeof window !== 'undefined' && localStorage.getItem('sm_skip_login')) {
      setChecked(true);
      return;
    }
    // Otherwise redirect to login
    router.replace('/login');
  }, [status, session, pathname, router]);

  // Show loading while checking auth
  if (!checked && status === 'loading') {
    return (
      <div className="min-h-screen bg-royal-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-gold-dim to-gold rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-royal-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 11-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.696.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 012.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0010.607 12m3.736 0l7.794 4.5-.802.215a4.5 4.5 0 01-2.48-.043l-5.326-1.629a4.324 4.324 0 01-2.068-1.379M14.343 12l-2.882 1.664" />
            </svg>
          </div>
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // Login page gets no nav
  if (pathname === '/login') {
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
