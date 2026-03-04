'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export function useSetting(key: string, defaultValue: string = '') {
  const setting = useLiveQuery(
    () => db.settings.get(key),
    [key]
  );
  return setting?.value ?? defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}

export function useCurrency() {
  return useSetting('currency', 'NGN');
}

export function useBusinessName() {
  return useSetting('businessName', 'TailorBook');
}

export function useTaxRate() {
  const val = useSetting('taxRate', '0');
  return parseFloat(val) || 0;
}

export function useBusinessPhone() {
  return useSetting('businessPhone', '');
}

export function useBusinessAddress() {
  return useSetting('businessAddress', '');
}

export function useBusinessLogo() {
  return useSetting('businessLogo', '');
}
