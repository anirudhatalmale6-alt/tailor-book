'use client';

import { useState, useEffect, useCallback } from 'react';

export interface LocalUser {
  name: string;
  phone: string;
  email: string;
}

const STORAGE_KEY = 'sm_user';
const PIN_KEY = 'sm_pin_hash';

// Simple fallback hash when crypto.subtle is not available
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Expand to a longer string for better uniqueness
  const h1 = Math.abs(hash).toString(16).padStart(8, '0');
  let hash2 = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    const char = str.charCodeAt(i);
    hash2 = ((hash2 << 7) - hash2) + char;
    hash2 = hash2 & hash2;
  }
  const h2 = Math.abs(hash2).toString(16).padStart(8, '0');
  return `fb_${h1}${h2}`;
}

async function hashPin(phone: string, pin: string): Promise<string> {
  const input = `${phone}:${pin}`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const data = new TextEncoder().encode(input);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fall through to fallback
  }
  return simpleHash(input);
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

export function hasRegisteredAccount(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(PIN_KEY) && !!localStorage.getItem(STORAGE_KEY);
}

export function useLocalAuth() {
  const [user, setUser] = useState<LocalUser | null>(() => {
    // Initialize from localStorage immediately (avoids flash)
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
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
    localStorage.removeItem('sm_skip_login');
    setUser(userData);
  }, []);

  // PIN-only login: reads stored phone from localStorage
  const loginWithPin = useCallback(async (pin: string): Promise<boolean> => {
    const stored = localStorage.getItem(PIN_KEY);
    if (!stored) return false;
    const existing = getLocalUser();
    if (!existing) return false;
    const attempt = await hashPin(existing.phone, pin);
    if (attempt !== stored) return false;
    setUser(existing);
    return true;
  }, []);

  // Legacy login with phone (kept for compatibility)
  const login = useCallback(async (phone: string, pin: string): Promise<boolean> => {
    const stored = localStorage.getItem(PIN_KEY);
    if (!stored) return false;
    const attempt = await hashPin(phone, pin);
    if (attempt !== stored) return false;
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

  return { user, loading, register, login, loginWithPin, logout, updateProfile };
}
