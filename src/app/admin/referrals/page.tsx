'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';

const ADMIN_EMAIL = 'pgmclement@gmail.com';

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
}

interface Withdrawal {
  id: string;
  email: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestedAt: string;
  processedAt?: string;
  reason?: string;
}

type TabKey = 'users' | 'withdrawals';

export default function AdminReferralsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [users, setUsers] = useState<ReferralUser[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('users');
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit referral code modal
  const [editingUser, setEditingUser] = useState<ReferralUser | null>(null);
  const [newReferredBy, setNewReferredBy] = useState('');
  const [savingCode, setSavingCode] = useState(false);

  // Reject reason modal
  const [rejectingWithdrawal, setRejectingWithdrawal] = useState<Withdrawal | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const email = session?.user?.email;

  const fetchData = useCallback(async () => {
    if (email !== ADMIN_EMAIL) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/referrals?admin_email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setWithdrawals(data.withdrawals || []);
      }
    } catch (e) {
      console.error('Failed to fetch admin data:', e);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleProcessWithdrawal(withdrawal: Withdrawal, status: 'approved' | 'rejected' | 'paid', reason?: string) {
    if (!email) return;
    setProcessing(withdrawal.id);
    try {
      await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_email: email,
          action: 'process-withdrawal',
          email: withdrawal.email,
          withdrawalId: withdrawal.id,
          status,
          reason,
        }),
      });
      fetchData();
    } catch {
      alert('Failed to process withdrawal');
    } finally {
      setProcessing(null);
      setRejectingWithdrawal(null);
      setRejectReason('');
    }
  }

  async function handleUpdateReferralCode() {
    if (!email || !editingUser || !newReferredBy.trim()) return;
    setSavingCode(true);
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_email: email,
          action: 'update-referral-code',
          email: editingUser.email,
          newReferredBy: newReferredBy.trim(),
        }),
      });
      if (res.ok) {
        setEditingUser(null);
        setNewReferredBy('');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update');
      }
    } catch {
      alert('Failed to update referral code');
    } finally {
      setSavingCode(false);
    }
  }

  if (!session?.user || email !== ADMIN_EMAIL) {
    return (
      <div className="px-4 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-1 text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">Admin</h1>
        </div>
        <div className="bg-royal-card rounded-xl p-6 text-center">
          <p className="text-sm text-red-400">Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-4 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-1 text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">RMS Admin</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending');
  const totalEarningsAll = users.reduce((sum, u) => sum + u.totalEarnings, 0);
  const totalWithdrawnAll = users.reduce((sum, u) => sum + u.withdrawnAmount, 0);

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.referralCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-1 text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">RMS Admin</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-royal-card rounded-xl p-3 text-center">
          <p className="text-[10px] text-white/60">Total Users</p>
          <p className="text-xl font-bold text-white">{users.length}</p>
        </div>
        <div className="bg-royal-card rounded-xl p-3 text-center">
          <p className="text-[10px] text-white/60">Pending Withdrawals</p>
          <p className="text-xl font-bold text-yellow-400">{pendingWithdrawals.length}</p>
        </div>
        <div className="bg-royal-card rounded-xl p-3 text-center">
          <p className="text-[10px] text-white/60">Total Earnings</p>
          <p className="text-lg font-bold text-gold">₦{totalEarningsAll.toLocaleString()}</p>
        </div>
        <div className="bg-royal-card rounded-xl p-3 text-center">
          <p className="text-[10px] text-white/60">Total Withdrawn</p>
          <p className="text-lg font-bold text-white">₦{totalWithdrawnAll.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-royal-card rounded-xl p-1 mb-4">
        <button
          onClick={() => setTab('users')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
            tab === 'users' ? 'bg-gradient-to-r from-gold-dim to-gold text-white' : 'text-white/60'
          }`}
        >
          Users ({users.length})
        </button>
        <button
          onClick={() => setTab('withdrawals')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors relative ${
            tab === 'withdrawals' ? 'bg-gradient-to-r from-gold-dim to-gold text-white' : 'text-white/60'
          }`}
        >
          Withdrawals
          {pendingWithdrawals.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {pendingWithdrawals.length}
            </span>
          )}
        </button>
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="space-y-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-royal-card rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="Search by email or code..."
          />
          {filteredUsers.map((user) => (
            <div key={user.email} className="bg-royal-card rounded-xl p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{user.email}</p>
                  <p className="text-[10px] text-white/40">Code: <span className="text-gold font-medium">{user.referralCode}</span></p>
                </div>
                <button
                  onClick={() => {
                    setEditingUser(user);
                    setNewReferredBy(user.referredBy);
                  }}
                  className="text-[10px] text-gold px-2 py-1 bg-gold-bg rounded-lg flex-shrink-0"
                >
                  Edit
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-white/40">Referrals</p>
                  <p className="text-sm font-bold text-white">{user.referralCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40">Earnings</p>
                  <p className="text-sm font-bold text-gold">₦{user.totalEarnings.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40">Balance</p>
                  <p className="text-sm font-bold text-green-400">₦{user.availableBalance.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-white/40">
                <span>Referred by: {user.referredBy}</span>
                <span>|</span>
                <span>BVN: {user.bvnVerified ? '✓' : '✗'}</span>
                <span>|</span>
                <span>Bank: {user.bankName || 'Not set'}</span>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <p className="text-xs text-white/40 text-center py-6">No users found</p>
          )}
        </div>
      )}

      {/* Withdrawals Tab */}
      {tab === 'withdrawals' && (
        <div className="space-y-3">
          {withdrawals.length === 0 ? (
            <p className="text-xs text-white/40 text-center py-6">No withdrawal requests</p>
          ) : (
            withdrawals.map((w) => (
              <div key={w.id} className="bg-royal-card rounded-xl p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{w.email}</p>
                    <p className="text-lg font-bold text-gold">₦{w.amount.toLocaleString()}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                    w.status === 'paid' ? 'bg-green-400/10 text-green-400' :
                    w.status === 'approved' ? 'bg-blue-400/10 text-blue-400' :
                    w.status === 'rejected' ? 'bg-red-400/10 text-red-400' :
                    'bg-yellow-400/10 text-yellow-400'
                  }`}>
                    {w.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-[10px] text-white/40 space-y-0.5 mb-2">
                  <p>Bank: {w.bankName} | Acc: {w.accountNumber}</p>
                  <p>Name: {w.accountName}</p>
                  <p>Requested: {new Date(w.requestedAt).toLocaleString()}</p>
                  {w.processedAt && <p>Processed: {new Date(w.processedAt).toLocaleString()}</p>}
                  {w.reason && <p className="text-red-400">Reason: {w.reason}</p>}
                </div>
                {w.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleProcessWithdrawal(w, 'approved')}
                      disabled={processing === w.id}
                      className="flex-1 py-2 bg-green-400/10 text-green-400 rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setRejectingWithdrawal(w);
                        setRejectReason('');
                      }}
                      disabled={processing === w.id}
                      className="flex-1 py-2 bg-red-400/10 text-red-400 rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
                {w.status === 'approved' && (
                  <button
                    onClick={() => handleProcessWithdrawal(w, 'paid')}
                    disabled={processing === w.id}
                    className="w-full py-2 bg-gradient-to-r from-gold-dim to-gold text-white rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    {processing === w.id ? 'Processing...' : 'Mark as Paid'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Referral Code Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit Referral Source"
      >
        <div className="space-y-3">
          <p className="text-xs text-white/60">User: {editingUser?.email}</p>
          <p className="text-xs text-white/60">Current referred by: {editingUser?.referredBy}</p>
          <div>
            <label className="block text-xs text-white mb-1">New Referred By Code</label>
            <input
              type="text"
              value={newReferredBy}
              onChange={(e) => setNewReferredBy(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold uppercase"
              placeholder="Enter referral code"
            />
          </div>
          <button
            onClick={handleUpdateReferralCode}
            disabled={savingCode || !newReferredBy.trim()}
            className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            {savingCode ? 'Saving...' : 'Update Referral Code'}
          </button>
        </div>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        isOpen={!!rejectingWithdrawal}
        onClose={() => setRejectingWithdrawal(null)}
        title="Reject Withdrawal"
      >
        <div className="space-y-3">
          <p className="text-xs text-white/60">
            Rejecting ₦{rejectingWithdrawal?.amount.toLocaleString()} for {rejectingWithdrawal?.email}
          </p>
          <div>
            <label className="block text-xs text-white mb-1">Reason (optional)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              rows={3}
              placeholder="Reason for rejection..."
            />
          </div>
          <button
            onClick={() => rejectingWithdrawal && handleProcessWithdrawal(rejectingWithdrawal, 'rejected', rejectReason)}
            className="w-full py-3 bg-red-500 text-white rounded-xl font-semibold text-sm"
          >
            Confirm Rejection
          </button>
        </div>
      </Modal>
    </div>
  );
}
