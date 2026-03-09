'use client';

import { useState, useEffect, useCallback } from 'react';

export interface LocalUser {
  name: string;
  phone: string;
  email: string;
}

const STORAGE_KEY = 'sm_user';
const PIN_KEY = 'sm_pin_hash';

// Simple hash for PIN verification (not for security-critical purposes)
async function hashPin(phone: string, pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${phone}:${pin}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getLocalUser(): LocalUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function useLocalAuth() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getLocalUser());
    setLoading(false);
  }, []);

  const register = useCallback(async (name: string, phone: string, email: string, pin: string) => {
    const userData: LocalUser = { name, phone, email };
    const pinHash = await hashPin(phone, pin);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    localStorage.setItem(PIN_KEY, pinHash);
    // Remove old skip flag if it exists
    localStorage.removeItem('sm_skip_login');
    setUser(userData);
  }, []);

  const login = useCallback(async (phone: string, pin: string): Promise<boolean> => {
    const stored = localStorage.getItem(PIN_KEY);
    if (!stored) return false;
    const attempt = await hashPin(phone, pin);
    if (attempt !== stored) return false;
    // User is already registered, just reload their profile
    const existing = getLocalUser();
    if (existing) {
      setUser(existing);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PIN_KEY);
    localStorage.removeItem('sm_skip_login');
    setUser(null);
  }, []);

  const updateProfile = useCallback((updates: Partial<LocalUser>) => {
    const current = getLocalUser();
    if (!current) return;
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setUser(updated);
  }, []);

  return { user, loading, register, login, logout, updateProfile };
}
