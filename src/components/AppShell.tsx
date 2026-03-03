'use client';

import BottomNav from './BottomNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-royal-bg">
      <main className="max-w-lg mx-auto pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
