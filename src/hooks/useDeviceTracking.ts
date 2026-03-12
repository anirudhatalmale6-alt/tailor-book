'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getLocalUser } from './useLocalAuth';

const DEVICE_ID_KEY = 'sm_device_id';

function generateDeviceId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'dev_';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Unknown Device';
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android.*?;\s*(.+?)\)/);
    return match ? match[1].trim() : 'Android Device';
  }
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux PC';
  return 'Unknown Device';
}

export interface DeviceEntry {
  deviceId: string;
  deviceName: string;
  lastActive: string;
  isCurrent?: boolean;
}

export function useDeviceTracking() {
  const hasRun = useRef(false);
  const [deviceLimitHit, setDeviceLimitHit] = useState(false);
  const [otherDevices, setOtherDevices] = useState<DeviceEntry[]>([]);

  useEffect(() => {
    if (hasRun.current) return;
    if (typeof window === 'undefined') return;

    const user = getLocalUser();
    if (!user?.email) return;

    const pinHash = localStorage.getItem('sm_pin_hash');
    if (!pinHash) return;

    hasRun.current = true;

    const deviceId = getDeviceId();
    const deviceName = getDeviceName();

    fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'heartbeat',
        email: user.email,
        pinHash,
        deviceId,
        deviceName,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error === 'device_limit') {
          setDeviceLimitHit(true);
          setOtherDevices(data.devices || []);
        } else if (data.devices) {
          setOtherDevices(data.devices);
        }
      })
      .catch(() => {});
  }, []);

  const removeDevice = useCallback(async (targetDeviceId: string) => {
    const user = getLocalUser();
    if (!user?.email) return false;
    const pinHash = localStorage.getItem('sm_pin_hash');
    if (!pinHash) return false;

    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_device',
          email: user.email,
          pinHash,
          targetDeviceId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOtherDevices(data.devices || []);
        setDeviceLimitHit(false);

        // Re-register this device after removing another
        const deviceId = getDeviceId();
        const deviceName = getDeviceName();
        fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'heartbeat',
            email: user.email,
            pinHash,
            deviceId,
            deviceName,
          }),
        }).catch(() => {});

        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }, []);

  const getDevices = useCallback(async (): Promise<DeviceEntry[]> => {
    const user = getLocalUser();
    if (!user?.email) return [];
    const pinHash = localStorage.getItem('sm_pin_hash');
    if (!pinHash) return [];

    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_devices',
          email: user.email,
          pinHash,
        }),
      });
      const data = await res.json();
      const currentDeviceId = getDeviceId();
      return (data.devices || []).map((d: DeviceEntry) => ({
        ...d,
        isCurrent: d.deviceId === currentDeviceId,
      }));
    } catch {
      return [];
    }
  }, []);

  return {
    deviceLimitHit,
    otherDevices,
    currentDeviceId: typeof window !== 'undefined' ? getDeviceId() : '',
    removeDevice,
    getDevices,
  };
}
