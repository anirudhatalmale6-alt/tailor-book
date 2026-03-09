'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalAuth, getLocalUser } from '@/hooks/useLocalAuth';

export default function LoginPage() {
  const router = useRouter();
  const { register, login } = useLocalAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Register fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Login fields
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // If no existing account, show register tab by default
  useEffect(() => {
    const existing = getLocalUser();
    if (!existing) {
      setTab('register');
    }
  }, []);

  async function handleRegister() {
    setError('');
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!phone.trim()) { setError('Please enter your phone number'); return; }
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { setError('PIN must be exactly 4 digits'); return; }
    if (pin !== confirmPin) { setError('PINs do not match'); return; }

    setLoading(true);
    try {
      await register(name.trim(), phone.trim(), email.trim().toLowerCase(), pin);
      router.replace('/');
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    setError('');
    if (!loginPhone.trim()) { setError('Please enter your phone number'); return; }
    if (loginPin.length !== 4 || !/^\d{4}$/.test(loginPin)) { setError('PIN must be exactly 4 digits'); return; }

    setLoading(true);
    try {
      const success = await login(loginPhone.trim(), loginPin);
      if (success) {
        router.replace('/');
      } else {
        setError('Invalid phone number or PIN');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-royal-bg flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="text-center mb-8">
        <img src="/logo.png" alt="Stitch Manager" className="w-36 h-36 mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-white mb-1">Stitch Manager</h1>
        <p className="text-white/60 text-sm">Your tailoring business, organized</p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-sm">
        <div className="bg-royal-card rounded-2xl p-5 shadow-lg border border-royal-border">
          {/* Tabs */}
          <div className="flex gap-1 bg-royal-bg rounded-xl p-1 mb-5">
            <button
              onClick={() => { setTab('login'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'login'
                  ? 'bg-gradient-to-r from-gold-dim to-gold text-white'
                  : 'text-white/60'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'register'
                  ? 'bg-gradient-to-r from-gold-dim to-gold text-white'
                  : 'text-white/60'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2 mb-4">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {tab === 'register' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-royal-bg rounded-xl border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-royal-bg rounded-xl border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="e.g., 08012345678"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-royal-bg rounded-xl border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Create 4-digit PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-3 py-2.5 bg-royal-bg rounded-xl border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold tracking-[0.5em] text-center text-lg"
                  placeholder="----"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Confirm PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-3 py-2.5 bg-royal-bg rounded-xl border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold tracking-[0.5em] text-center text-lg"
                  placeholder="----"
                />
              </div>
              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-royal-bg rounded-xl border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="e.g., 08012345678"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">4-digit PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-3 py-2.5 bg-royal-bg rounded-xl border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold tracking-[0.5em] text-center text-lg"
                  placeholder="----"
                />
              </div>
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-white/30 text-center mt-6">
          Your data is stored locally on your device. No internet needed after setup.
        </p>
      </div>
    </div>
  );
}
