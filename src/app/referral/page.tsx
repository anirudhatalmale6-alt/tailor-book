'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';

interface ReferralUser {
  email: string;
  referralCode: string;
  referredBy: string;
  totalEarnings: number;
  withdrawnAmount: number;
  availableBalance: number;
  referralCount: number;
  referredUsers: string[];
  bankName: string;
  accountNumber: string;
  accountName: string;
  bvn: string;
  bvnVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EarningTransaction {
  id: string;
  type: 'commission' | 'registration';
  fromEmail: string;
  amount: number;
  paymentAmount: number;
  plan?: string;
  date: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestedAt: string;
  processedAt?: string;
  reason?: string;
}

type TabKey = 'overview' | 'history' | 'bank' | 'withdraw';

export default function ReferralPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [user, setUser] = useState<ReferralUser | null>(null);
  const [transactions, setTransactions] = useState<EarningTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('overview');
  const [copied, setCopied] = useState(false);

  // Bank form
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bvn, setBvn] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  // Withdrawal
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const email = session?.user?.email;

  const fetchData = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/referral?email=${encodeURIComponent(email)}&withdrawals=1`);
      if (res.ok) {
        const data = await res.json();
        const { withdrawals: w, transactions: t, ...userData } = data;
        setUser(userData);
        setWithdrawals(w || []);
        setTransactions(t || []);
        setBankName(userData.bankName || '');
        setAccountNumber(userData.accountNumber || '');
        setAccountName(userData.accountName || '');
        setBvn(userData.bvn || '');
      }
    } catch (e) {
      console.error('Failed to fetch referral data:', e);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function copyCode() {
    if (!user) return;
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    if (!user) return;
    const message = `Hey! I use Stitch Manager to manage my tailoring business — measurements, orders, payments, everything in one app. Use my referral code *${user.referralCode}* when you sign up and we both benefit! Download here: https://stitchmanager.vercel.app/subscription?ref=${user.referralCode}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  }

  async function handleSaveBank() {
    if (!email) return;
    setSavingBank(true);
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-bank',
          email,
          bankName,
          accountNumber,
          accountName,
          bvn: bvn || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        alert('Bank details saved successfully!');
      } else {
        alert(data.error || 'Failed to save');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setSavingBank(false);
    }
  }

  async function handleWithdraw() {
    if (!email) return;
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    setWithdrawing(true);
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'withdraw', email, amount }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        alert('Withdrawal request submitted! It will be processed within 24-48 hours.');
        fetchData();
      } else {
        alert(data.error || 'Failed to submit withdrawal');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  }

  // Not signed in
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
          <p className="text-sm text-white/60 mb-4">Sign in to access your referral dashboard and start earning</p>
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

  // Loading
  if (loading) {
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
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Not registered in RMS yet
  if (!user) {
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
        <div className="bg-royal-card rounded-xl p-6 text-center">
          <svg className="w-12 h-12 text-gold mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <h2 className="text-lg font-bold text-white mb-2">Start Earning with Referrals</h2>
          <p className="text-sm text-white/60 mb-4">
            Subscribe to any plan to get your unique referral code. Share it with fellow tailors and earn 5% of every payment they make — permanently!
          </p>
          <button
            onClick={() => router.push('/subscription')}
            className="px-6 py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold"
          >
            Subscribe Now
          </button>
        </div>
        <div className="bg-royal-card rounded-xl p-4 mt-4">
          <h2 className="text-sm font-semibold text-white mb-3">How It Works</h2>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Subscribe', desc: 'Choose any plan and complete payment' },
              { step: '2', title: 'Get your code', desc: 'A unique referral code is generated for you' },
              { step: '3', title: 'Share & earn', desc: 'When someone uses your code, you earn 5% of their payments forever' },
              { step: '4', title: 'Withdraw', desc: 'Once you reach ₦4,320, withdraw to your bank account' },
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

  const canWithdraw = user.bvnVerified && user.availableBalance >= 4320 && user.accountNumber;

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-1 text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">Referral Dashboard</h1>
      </div>

      {/* Referral Code Card */}
      <div className="bg-gradient-to-br from-gold-dim/20 to-gold/10 rounded-xl p-4 mb-4 border border-gold/20">
        <p className="text-xs text-white/60 mb-1">Your Referral Code</p>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl font-bold text-gold tracking-widest">{user.referralCode}</span>
          <button
            onClick={copyCode}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              copied ? 'bg-green-400/10 text-green-400' : 'bg-royal-card text-white'
            }`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-[10px] text-white/40">Referred by: {user.referredBy}</p>
      </div>

      {/* Quick Share */}
      <button
        onClick={shareWhatsApp}
        className="w-full flex items-center justify-center gap-2 py-3 bg-green-400/10 text-green-400 rounded-xl font-medium text-sm mb-4"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Share via WhatsApp
      </button>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-royal-card rounded-xl p-1 mb-4">
        {([
          { key: 'overview' as TabKey, label: 'Overview' },
          { key: 'history' as TabKey, label: 'Activity' },
          { key: 'bank' as TabKey, label: 'Bank' },
          { key: 'withdraw' as TabKey, label: 'Withdraw' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-colors ${
              tab === t.key
                ? 'bg-gradient-to-r from-gold-dim to-gold text-white'
                : 'text-white/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-royal-card rounded-xl p-4 text-center">
              <p className="text-xs text-white/60 mb-1">Total Referrals</p>
              <p className="text-2xl font-bold text-white">{user.referralCount}</p>
            </div>
            <div className="bg-royal-card rounded-xl p-4 text-center">
              <p className="text-xs text-white/60 mb-1">Total Earnings</p>
              <p className="text-2xl font-bold text-gold">₦{user.totalEarnings.toLocaleString()}</p>
            </div>
            <div className="bg-royal-card rounded-xl p-4 text-center">
              <p className="text-xs text-white/60 mb-1">Withdrawn</p>
              <p className="text-2xl font-bold text-white">₦{user.withdrawnAmount.toLocaleString()}</p>
            </div>
            <div className="bg-royal-card rounded-xl p-4 text-center">
              <p className="text-xs text-white/60 mb-1">Available</p>
              <p className="text-2xl font-bold text-green-400">₦{user.availableBalance.toLocaleString()}</p>
            </div>
          </div>

          <button
            onClick={() => canWithdraw ? setShowWithdrawModal(true) : null}
            disabled={!canWithdraw}
            className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Request Withdrawal
          </button>
          {!canWithdraw && (
            <div className="bg-royal-card rounded-xl p-3">
              <p className="text-xs text-white/60">
                {!user.bvnVerified && !user.accountNumber
                  ? 'Add your bank details and verify your BVN to enable withdrawals.'
                  : !user.bvnVerified
                  ? 'Verify your BVN in Bank Details to enable withdrawals.'
                  : !user.accountNumber
                  ? 'Add your bank details to enable withdrawals.'
                  : `Minimum withdrawal is ₦4,320. You need ₦${(4320 - user.availableBalance).toLocaleString()} more.`}
              </p>
            </div>
          )}

          {user.referredUsers.length > 0 && (
            <div className="bg-royal-card rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Your Referrals</h3>
              <div className="space-y-2">
                {user.referredUsers.map((refEmail) => (
                  <div key={refEmail} className="flex items-center gap-2 bg-royal-bg rounded-lg px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-gold-bg flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-gold">{refEmail[0].toUpperCase()}</span>
                    </div>
                    <span className="text-sm text-white truncate">{refEmail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-royal-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">How It Works</h3>
            <div className="space-y-3">
              {[
                { step: '1', title: 'Share your code', desc: 'Send your referral code to fellow tailors' },
                { step: '2', title: 'They subscribe', desc: 'When they sign up, they enter your code' },
                { step: '3', title: 'You earn 5%', desc: 'Every time they pay, you get 5% — permanently' },
                { step: '4', title: 'Withdraw', desc: 'Request payout once you reach ₦4,320' },
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
      )}

      {/* Activity / Transaction History Tab */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="bg-royal-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Transaction History</h3>
            {transactions.length === 0 ? (
              <div className="text-center py-6">
                <svg className="w-10 h-10 text-white/20 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-xs text-white/40">No transactions yet</p>
                <p className="text-[10px] text-white/30 mt-1">When someone uses your code, you&apos;ll see their activity here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((txn) => (
                  <div key={txn.id} className="bg-royal-bg rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          txn.type === 'commission' ? 'bg-green-400/10' : 'bg-blue-400/10'
                        }`}>
                          {txn.type === 'commission' ? (
                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">
                            {txn.type === 'commission' ? 'Commission Earned' : 'New Referral Joined'}
                          </p>
                          <p className="text-[10px] text-white/40 truncate">{txn.fromEmail}</p>
                        </div>
                      </div>
                      {txn.type === 'commission' && (
                        <span className="text-sm font-bold text-green-400 flex-shrink-0">
                          +₦{txn.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-white/30">
                        {new Date(txn.date).toLocaleDateString()} {new Date(txn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {txn.type === 'commission' && txn.paymentAmount > 0 && (
                        <p className="text-[10px] text-white/30">
                          5% of ₦{txn.paymentAmount.toLocaleString()}{txn.plan ? ` (${txn.plan})` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bank Details Tab */}
      {tab === 'bank' && (
        <div className="space-y-4">
          <div className="bg-royal-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Bank Account</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white mb-1">Bank Name *</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="e.g., First Bank, GTBank, UBA"
                />
              </div>
              <div>
                <label className="block text-xs text-white mb-1">Account Number *</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="10-digit account number"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-xs text-white mb-1">Account Name *</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="Name on the account"
                />
              </div>
            </div>
          </div>

          <div className="bg-royal-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">BVN Verification</h3>
              {user.bvnVerified ? (
                <span className="text-xs bg-green-400/10 text-green-400 px-2 py-0.5 rounded-full font-medium">Verified</span>
              ) : user.bvn ? (
                <span className="text-xs bg-red-400/10 text-red-400 px-2 py-0.5 rounded-full font-medium">Not Verified</span>
              ) : (
                <span className="text-xs bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full font-medium">Required</span>
              )}
            </div>
            <p className="text-[10px] text-white/40 mb-3">
              BVN verification is required to process withdrawals. Your BVN is securely verified via Paystack and never stored in plain text.
            </p>
            <input
              type="text"
              value={bvn}
              onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
              disabled={user.bvnVerified}
              className={`w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold ${
                user.bvnVerified ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              placeholder="11-digit BVN"
              maxLength={11}
            />
          </div>

          <button
            onClick={handleSaveBank}
            disabled={savingBank || !bankName || !accountNumber || !accountName}
            className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {savingBank ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Bank Details'
            )}
          </button>
        </div>
      )}

      {/* Withdrawals Tab */}
      {tab === 'withdraw' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-gold-dim/20 to-gold/10 rounded-xl p-4 border border-gold/20">
            <p className="text-xs text-white/60 mb-1">Available Balance</p>
            <p className="text-3xl font-bold text-gold">₦{user.availableBalance.toLocaleString()}</p>
            <p className="text-[10px] text-white/40 mt-1">Minimum withdrawal: ₦4,320</p>
          </div>

          <button
            onClick={() => canWithdraw ? setShowWithdrawModal(true) : null}
            disabled={!canWithdraw}
            className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold text-sm disabled:opacity-40"
          >
            Request Withdrawal
          </button>

          <div className="bg-royal-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Withdrawal History</h3>
            {withdrawals.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-4">No withdrawal requests yet</p>
            ) : (
              <div className="space-y-2">
                {withdrawals.map((w) => (
                  <div key={w.id} className="bg-royal-bg rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">₦{w.amount.toLocaleString()}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        w.status === 'paid' ? 'bg-green-400/10 text-green-400' :
                        w.status === 'approved' ? 'bg-blue-400/10 text-blue-400' :
                        w.status === 'rejected' ? 'bg-red-400/10 text-red-400' :
                        'bg-yellow-400/10 text-yellow-400'
                      }`}>
                        {w.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/40">
                      {new Date(w.requestedAt).toLocaleDateString()}
                      {w.processedAt && ` — Processed ${new Date(w.processedAt).toLocaleDateString()}`}
                    </p>
                    {w.reason && <p className="text-[10px] text-red-400 mt-1">{w.reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      <Modal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        title="Request Withdrawal"
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs text-white/60 mb-1">Available: ₦{user.availableBalance.toLocaleString()}</p>
            <p className="text-xs text-white/40 mb-3">Minimum: ₦4,320 | Paid to: {user.bankName} ({user.accountNumber})</p>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full px-4 py-3 bg-royal-bg rounded-xl border border-royal-border text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Enter amount"
              min={4320}
              max={user.availableBalance}
            />
          </div>
          <button
            onClick={() => setWithdrawAmount(user.availableBalance.toString())}
            className="w-full py-2 bg-royal-hover text-white/60 rounded-lg text-xs font-medium"
          >
            Withdraw All (₦{user.availableBalance.toLocaleString()})
          </button>
          <button
            onClick={handleWithdraw}
            disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) < 4320}
            className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {withdrawing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              'Submit Withdrawal Request'
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
