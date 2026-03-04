'use client';

import { useState, useEffect, useCallback } from 'react';

const PLAN_DURATIONS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  biannual: 180,
  yearly: 365,
};

// Grace period: 3 days after expiry before going read-only
const GRACE_DAYS = 3;

export interface SubscriptionState {
  status: 'active' | 'expired' | 'none';
  plan: string;
  subscribedDate: string | null;
  expiryDate: string | null;
  daysLeft: number;
  isReadOnly: boolean;
}

export function useSubscription(): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({
    status: 'none',
    plan: '',
    subscribedDate: null,
    expiryDate: null,
    daysLeft: 0,
    isReadOnly: false,
  });

  useEffect(() => {
    const subStatus = localStorage.getItem('subscription_status');
    const subPlan = localStorage.getItem('subscription_plan') || '';
    const subDate = localStorage.getItem('subscription_date');

    if (subStatus !== 'active' || !subDate) {
      // No subscription at all — still allow usage (free tier / not yet enforced)
      // Once Paystack is connected, change isReadOnly: true for 'none' status
      setState({
        status: 'none',
        plan: '',
        subscribedDate: null,
        expiryDate: null,
        daysLeft: 0,
        isReadOnly: false,
      });
      return;
    }

    const startDate = new Date(subDate);
    const durationDays = PLAN_DURATIONS[subPlan] || 30;
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    const now = new Date();
    const msLeft = expiryDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

    if (daysLeft > 0) {
      setState({
        status: 'active',
        plan: subPlan,
        subscribedDate: subDate,
        expiryDate: expiryDate.toISOString(),
        daysLeft,
        isReadOnly: false,
      });
    } else {
      // Expired — read-only after grace period
      const daysPastExpiry = Math.abs(daysLeft);
      setState({
        status: 'expired',
        plan: subPlan,
        subscribedDate: subDate,
        expiryDate: expiryDate.toISOString(),
        daysLeft: 0,
        isReadOnly: daysPastExpiry > GRACE_DAYS,
      });
    }
  }, []);

  return state;
}

/**
 * Hook that returns a function to check if an action is allowed.
 * If read-only, shows an alert and returns false.
 */
export function useReadOnlyGuard(): () => boolean {
  const { isReadOnly } = useSubscription();

  return useCallback(() => {
    if (isReadOnly) {
      alert('Your subscription has expired. Please renew to continue editing. You can still view your data.');
      return false;
    }
    return true;
  }, [isReadOnly]);
}
