'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useBackupFrequency, useLastAutoBackup } from '@/hooks/useSettings';
import { backupToGoogleDrive } from '@/lib/gdrive-backup';
import { setSetting } from '@/hooks/useSettings';

function getIntervalMs(frequency: string): number {
  switch (frequency) {
    case 'daily': return 24 * 60 * 60 * 1000;
    case 'weekly': return 7 * 24 * 60 * 60 * 1000;
    case 'monthly': return 30 * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

export default function AutoBackup() {
  const { data: session } = useSession();
  const backupFrequency = useBackupFrequency();
  const lastAutoBackup = useLastAutoBackup();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    if (!session?.accessToken) return;
    if (backupFrequency === 'off') return;

    const interval = getIntervalMs(backupFrequency);
    if (interval === 0) return;

    const lastTime = lastAutoBackup ? new Date(lastAutoBackup).getTime() : 0;
    const now = Date.now();

    if (now - lastTime >= interval) {
      hasRun.current = true;
      backupToGoogleDrive(session.accessToken).then((result) => {
        if (result.success) {
          setSetting('lastAutoBackup', new Date().toISOString());
        } else if (result.error?.toLowerCase().includes('scope') || result.error?.toLowerCase().includes('insufficient')) {
          // Scope error — stop auto-backup to avoid spam, user needs to re-link
          console.warn('Auto-backup skipped: insufficient scopes. User needs to re-link Google account.');
        }
      });
    }
  }, [session?.accessToken, backupFrequency, lastAutoBackup]);

  return null;
}
