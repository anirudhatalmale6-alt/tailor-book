'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalAuth, hasRegisteredAccount, getLocalUser } from '@/hooks/useLocalAuth';

// ─── PIN Pad Component (like Chipper) ─────────────────────────
function PinPad({ onComplete, loading, error, userName }: {
  onComplete: (pin: string) => void;
  loading: boolean;
  error: string;
  userName: string;
}) {
  const [pin, setPin] = useState('');

  const handleDigit = useCallback((digit: string) => {
    if (loading) return;
    const next = pin + digit;
    if (next.length <= 4) {
      setPin(next);
      if (next.length === 4) {
        onComplete(next);
        // Reset after a delay so dots show filled briefly
        setTimeout(() => setPin(''), 500);
      }
    }
  }, [pin, loading, onComplete]);

  const handleDelete = useCallback(() => {
    if (loading) return;
    setPin((p) => p.slice(0, -1));
  }, [loading]);

  return (
    <div className="min-h-screen bg-royal-bg flex flex-col items-center justify-center px-6">
      {/* User avatar */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold-dim to-gold flex items-center justify-center mb-4">
        <span className="text-3xl font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
      </div>
      <p className="text-white/80 text-sm mb-1">Welcome back,</p>
      <h2 className="text-white text-xl font-bold mb-8">{userName}</h2>

      {/* PIN dots */}
      <div className="flex gap-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              i < pin.length
                ? 'bg-gold scale-110'
                : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      <p className="text-white/50 text-sm mb-2">
        {loading ? 'Verifying...' : 'Enter your PIN'}
      </p>

      {error && (
        <p className="text-red-400 text-xs mb-4">{error}</p>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-4 w-64 mt-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
          <button
            key={key || 'empty'}
            onClick={() => {
              if (key === 'del') handleDelete();
              else if (key) handleDigit(key);
            }}
            disabled={!key || loading}
            className={`h-16 rounded-2xl text-2xl font-medium transition-all ${
              !key
                ? 'invisible'
                : key === 'del'
                  ? 'text-white/60 active:bg-white/5'
                  : 'text-white active:bg-white/10 hover:bg-white/5'
            }`}
          >
            {key === 'del' ? (
              <svg className="w-7 h-7 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l7-7 11 0 0 14-11 0-7-7z" />
              </svg>
            ) : key}
          </button>
        ))}
      </div>

      <button
        onClick={() => {
          // Clear account and show registration
          localStorage.removeItem('sm_user');
          localStorage.removeItem('sm_pin_hash');
          window.location.reload();
        }}
        className="text-gold/60 text-xs mt-8 hover:text-gold transition-colors"
      >
        Forgot PIN? Reset Account
      </button>
    </div>
  );
}

// ─── Registration Flow ─────────────────────────────────────────
function RegisterFlow({ onComplete }: { onComplete: () => void }) {
  const { register } = useLocalAuth();
  const [step, setStep] = useState(1); // 1=details, 2=verify email, 3=create PIN
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Step 2 fields
  const [verifyToken, setVerifyToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Step 3 fields
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  async function handleStep1() {
    setError('');
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!phone.trim()) { setError('Please enter your phone number'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send verification code');
        return;
      }
      setVerifyToken(data.token);
      setResendTimer(60);
      setStep(2);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2() {
    setError('');
    if (otpCode.length !== 6) { setError('Please enter the 6-digit code'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', otp: otpCode, token: verifyToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed');
        return;
      }
      setStep(3);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to resend code');
        return;
      }
      setVerifyToken(data.token);
      setResendTimer(60);
      setOtpCode('');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function handleStep3() {
    setError('');
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { setError('PIN must be exactly 4 digits'); return; }
    if (pin !== confirmPin) { setError('PINs do not match'); return; }

    setLoading(true);
    try {
      await register(name.trim(), phone.trim(), email.trim().toLowerCase(), pin);
      onComplete();
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-royal-bg flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="text-center mb-6">
        <img src="/logo.png" alt="Stitch Manager" className="w-28 h-28 mx-auto mb-2" />
        <h1 className="text-2xl font-bold text-white mb-1">Stitch Manager</h1>
        <p className="text-white/60 text-xs">Your tailoring business, organized</p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              s < step ? 'bg-green-500 text-white' :
              s === step ? 'bg-gold text-white' :
              'bg-white/10 text-white/40'
            }`}>
              {s < step ? '✓' : s}
            </div>
            {s < 3 && <div className={`w-6 h-0.5 ${s < step ? 'bg-green-500' : 'bg-white/10'}`} />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-royal-card rounded-2xl p-5 shadow-lg border border-royal-border">
          {error && (
            <div className="bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2 mb-4">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="text-white font-semibold text-sm mb-3 text-center">Create Account</h3>
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
                <label className="block text-xs text-white/60 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-royal-bg rounded-xl border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="your@email.com"
                />
              </div>
              <button
                onClick={handleStep1}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          )}

          {/* Step 2: Verify Email */}
          {step === 2 && (
            <div className="space-y-3">
              <h3 className="text-white font-semibold text-sm mb-1">Verify Your Email</h3>
              <p className="text-white/50 text-xs mb-3">
                We sent a 6-digit code to <span className="text-gold">{email}</span>
              </p>
              <div>
                <label className="block text-xs text-white/60 mb-1">Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-3 py-3 bg-royal-bg rounded-xl border border-royal-border text-white text-lg focus:outline-none focus:ring-2 focus:ring-gold tracking-[0.5em] text-center font-mono"
                  placeholder="000000"
                  autoFocus
                />
              </div>
              <button
                onClick={handleStep2}
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </button>
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => { setStep(1); setError(''); }}
                  className="text-white/40 text-xs hover:text-white/60"
                >
                  ← Change email
                </button>
                {resendTimer > 0 ? (
                  <span className="text-white/30 text-xs">Resend in {resendTimer}s</span>
                ) : (
                  <button
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-gold text-xs hover:text-gold/80"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Create PIN */}
          {step === 3 && (
            <div className="space-y-3">
              <h3 className="text-white font-semibold text-sm mb-1">Create Your PIN</h3>
              <p className="text-white/50 text-xs mb-3">
                This PIN will be used to unlock your app
              </p>
              <div>
                <label className="block text-xs text-white/60 mb-1">Create 4-digit PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-3 py-3 bg-royal-bg rounded-xl border border-royal-border text-white text-lg focus:outline-none focus:ring-2 focus:ring-gold tracking-[0.5em] text-center"
                  placeholder="- - - -"
                  autoFocus
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
                  className="w-full px-3 py-3 bg-royal-bg rounded-xl border border-royal-border text-white text-lg focus:outline-none focus:ring-2 focus:ring-gold tracking-[0.5em] text-center"
                  placeholder="- - - -"
                />
              </div>
              <button
                onClick={handleStep3}
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
          )}
        </div>

        <p className="text-xs text-white/30 text-center mt-6">
          Your data is stored locally on your device. No internet needed after setup.
        </p>
      </div>
    </div>
  );
}

// ─── Main Login Page ─────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const { loginWithPin } = useLocalAuth();
  const [mode, setMode] = useState<'loading' | 'pin' | 'register'>('loading');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (hasRegisteredAccount()) {
      const u = getLocalUser();
      setUserName(u?.name || 'User');
      setMode('pin');
    } else {
      setMode('register');
    }
  }, []);

  const handlePinComplete = useCallback(async (pin: string) => {
    setPinError('');
    setPinLoading(true);
    try {
      const success = await loginWithPin(pin);
      if (success) {
        router.replace('/');
      } else {
        setPinError('Incorrect PIN. Try again.');
      }
    } catch {
      setPinError('Login failed. Please try again.');
    } finally {
      setPinLoading(false);
    }
  }, [loginWithPin, router]);

  if (mode === 'loading') {
    return (
      <div className="min-h-screen bg-royal-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (mode === 'pin') {
    return (
      <PinPad
        onComplete={handlePinComplete}
        loading={pinLoading}
        error={pinError}
        userName={userName}
      />
    );
  }

  return (
    <RegisterFlow onComplete={() => router.replace('/')} />
  );
}
