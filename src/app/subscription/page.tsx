'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Plan {
  id: string;
  name: string;
  period: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  perMonth: number;
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    period: 'month',
    price: 495,
    perMonth: 495,
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    period: '3 months',
    price: 1451.25,
    perMonth: 483.75,
    discount: 'Save 2%',
  },
  {
    id: 'biannual',
    name: 'Bi-Annual',
    period: '6 months',
    price: 2862,
    perMonth: 477,
    discount: 'Save 4%',
    popular: true,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    period: 'year',
    price: 4320,
    originalPrice: 5400,
    perMonth: 360,
    discount: 'Save 20%',
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedPlan, setSelectedPlan] = useState<string>('biannual');
  const [processing, setProcessing] = useState(false);

  async function handleSubscribe() {
    if (!session?.user?.email) {
      router.push('/login');
      return;
    }

    const plan = PLANS.find((p) => p.id === selectedPlan);
    if (!plan) return;

    setProcessing(true);

    try {
      // Initialize Paystack payment
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.user.email,
          amount: Math.round(plan.price * 100), // Paystack uses kobo
          plan: plan.id,
        }),
      });

      const data = await response.json();

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        alert('Failed to initialize payment. Please try again.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-1 text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">Choose Your Plan</h1>
      </div>

      {/* Features */}
      <div className="bg-royal-card rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-gold mb-3">Premium Features</h2>
        <div className="space-y-2">
          {[
            'Unlimited accounts & measurements',
            'Colleague financial tracking',
            'Job statements via WhatsApp',
            'Google Drive cloud backup',
            'Style reference images',
            'Invoice generation',
            'Project management',
            'Priority support',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-white">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div className="space-y-3 mb-6">
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
              selectedPlan === plan.id
                ? 'border-gold bg-gold-bg'
                : 'border-royal-border bg-royal-card'
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-2.5 right-3 bg-gold text-royal-bg text-[10px] font-bold px-2 py-0.5 rounded-full">
                POPULAR
              </span>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{plan.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg font-bold text-gold">
                    ₦{plan.price.toLocaleString()}
                  </span>
                  {plan.originalPrice && (
                    <span className="text-xs text-white/40 line-through">
                      ₦{plan.originalPrice.toLocaleString()}
                    </span>
                  )}
                  <span className="text-xs text-white/60">/ {plan.period}</span>
                </div>
                <p className="text-[10px] text-white/40 mt-0.5">
                  ₦{plan.perMonth.toLocaleString()}/month
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {plan.discount && (
                  <span className="text-[10px] font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                    {plan.discount}
                  </span>
                )}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === plan.id ? 'border-gold' : 'border-royal-border'
                }`}>
                  {selectedPlan === plan.id && (
                    <div className="w-3 h-3 rounded-full bg-gold" />
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Referral Code */}
      <div className="bg-royal-card rounded-xl p-4 mb-6">
        <label className="block text-sm text-white mb-2">Have a referral code?</label>
        <input
          type="text"
          className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold uppercase"
          placeholder="Enter referral code"
        />
      </div>

      {/* Subscribe Button */}
      <button
        onClick={handleSubscribe}
        disabled={processing}
        className="w-full py-3.5 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Subscribe — ₦{PLANS.find((p) => p.id === selectedPlan)?.price.toLocaleString()}
          </>
        )}
      </button>

      <p className="text-center text-[10px] text-white/30 mt-3">
        Secured by Paystack. Cancel anytime.
      </p>
    </div>
  );
}
