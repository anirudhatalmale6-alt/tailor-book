'use client';

import { SessionProvider } from 'next-auth/react';
import AutoBackup from './AutoBackup';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AutoBackup />
      {children}
    </SessionProvider>
  );
}
