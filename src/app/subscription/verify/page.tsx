'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const reference = searchParams.get('reference') || searchParams.get('trxref');

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      return;
    }

    fetch(`/api/paystack/verify?reference=${reference}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          setStatus('success');
          // Store subscription status locally
          localStorage.setItem('subscription_status', 'active');
          localStorage.setItem('subscription_plan', data.plan || 'monthly');
          localStorage.setItem('subscription_date', new Date().toISOString());
        } else {
          setStatus('failed');
        }
      })
      .catch(() => setStatus('failed'));
  }, [reference]);

  return (
    <div className="min-h-screen bg-royal-bg flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Verifying Payment</h1>
            <p className="text-sm text-white/60">Please wait while we confirm your payment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Payment Successful!</h1>
            <p className="text-sm text-white/60 mb-6">Your premium subscription is now active. Enjoy all features!</p>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Payment Failed</h1>
            <p className="text-sm text-white/60 mb-6">Something went wrong with your payment. Please try again.</p>
            <button
              onClick={() => router.push('/subscription')}
              className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-royal-bg flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
