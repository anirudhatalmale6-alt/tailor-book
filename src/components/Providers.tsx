'use client';

import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import AutoBackup from './AutoBackup';

function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => {
        // Pre-cache assetlinks.json for TWA verification offline
        fetch('/.well-known/assetlinks.json').catch(() => {});
      }).catch(() => {
        // SW registration failed — app still works, just no offline cache
      });
    }
  }, []);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ServiceWorkerRegistrar />
      <AutoBackup />
      {children}
    </SessionProvider>
  );
}
