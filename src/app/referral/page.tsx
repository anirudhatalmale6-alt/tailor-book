'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ReferralPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [earnings, setEarnings] = useState(0);
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    // Generate or load referral code from localStorage
    if (session?.user?.email) {
      const storedCode = localStorage.getItem('referral_code');
      if (storedCode) {
        setReferralCode(storedCode);
      } else {
        // Generate a code from the user's name
        const name = session.user.name?.split(' ')[0]?.toUpperCase() || 'USER';
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `${name}${random}`;
        localStorage.setItem('referral_code', code);
        setReferralCode(code);
      }

      // Load referral stats
      const storedEarnings = parseFloat(localStorage.getItem('referral_earnings') || '0');
      const storedCount = parseInt(localStorage.getItem('referral_count') || '0');
      setEarnings(storedEarnings);
      setReferralCount(storedCount);
    }
  }, [session]);

  function copyReferralCode() {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareViaWhatsApp() {
    const message = `Hey! I use StitchManager to manage my tailoring business — measurements, orders, payments, everything in one app. Use my referral code *${referralCode}* when you sign up and we both benefit! Download here: https://stitchmanager.vercel.app`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  }

  if (!session?.user) {
    return (
      <div className="px-4 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-1 text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">Referrals</h1>
        </div>
        <div className="bg-royal-card rounded-xl p-6 text-center">
          <p className="text-sm text-white/60 mb-4">Sign in to get your referral code and start earning</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-1 text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">Referrals</h1>
      </div>

      {/* Referral Code Card */}
      <div className="bg-gradient-to-br from-gold-dim/20 to-gold/10 rounded-xl p-6 mb-4 border border-gold/20">
        <h2 className="text-sm text-white/60 mb-1">Your Referral Code</h2>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-gold tracking-widest">{referralCode}</span>
          <button
            onClick={copyReferralCode}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              copied ? 'bg-green-400/10 text-green-400' : 'bg-royal-card text-white'
            }`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-white/40">Share this code with fellow tailors. You earn 5% of every payment they make — forever!</p>
      </div>

      {/* Quick Share */}
      <button
        onClick={shareViaWhatsApp}
        className="w-full flex items-center justify-center gap-2 py-3 bg-green-400/10 text-green-400 rounded-xl font-medium text-sm mb-6"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Share via WhatsApp
      </button>

      {/* Earnings Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-royal-card rounded-xl p-4 text-center">
          <p className="text-xs text-white/60 mb-1">Total Referrals</p>
          <p className="text-2xl font-bold text-white">{referralCount}</p>
        </div>
        <div className="bg-royal-card rounded-xl p-4 text-center">
          <p className="text-xs text-white/60 mb-1">Total Earnings</p>
          <p className="text-2xl font-bold text-gold">₦{earnings.toLocaleString()}</p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-royal-card rounded-xl p-4">
        <h2 className="text-sm font-semibold text-white mb-3">How It Works</h2>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Share your code', desc: 'Send your referral code to fellow tailors' },
            { step: '2', title: 'They subscribe', desc: 'When they sign up and choose a plan, they enter your code' },
            { step: '3', title: 'You earn 5%', desc: 'Every time they pay, you get 5% — permanently' },
            { step: '4', title: 'Use or withdraw', desc: 'Use earnings as subscription credit or request cash payout' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gold-bg flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-gold">{item.step}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="text-xs text-white/60">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
