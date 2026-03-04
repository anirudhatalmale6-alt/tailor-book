import { NextResponse } from 'next/server';
import { getUser, createUser, saveUser, getUserByCode, addEarning, createWithdrawal, getWithdrawals, getTransactions } from '@/lib/referral-store';

// GET /api/referral?email=...  — Get user's referral dashboard data
// GET /api/referral?email=...&withdrawals=1  — Include withdrawal history
// GET /api/referral?validate=CODE  — Validate a referral code
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Validate referral code
  const validateCode = searchParams.get('validate');
  if (validateCode) {
    const code = validateCode.toUpperCase();
    if (code === 'STITCHMANAGER') {
      return NextResponse.json({ valid: true, type: 'company' });
    }
    const referrer = await getUserByCode(code);
    if (referrer) {
      return NextResponse.json({ valid: true, type: 'user' });
    }
    return NextResponse.json({ valid: false });
  }

  const email = searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const user = await getUser(email);
  if (!user) {
    return NextResponse.json({ error: 'User not found in RMS' }, { status: 404 });
  }

  // Include withdrawals and transactions if requested
  if (searchParams.get('withdrawals') === '1') {
    const [withdrawals, transactions] = await Promise.all([
      getWithdrawals(email),
      getTransactions(email),
    ]);
    return NextResponse.json({ ...user, withdrawals, transactions });
  }

  return NextResponse.json(user);
}

// POST /api/referral — Register, update bank, add earnings, or request withdrawal
export async function POST(req: Request) {
  const body = await req.json();
  const { action, email } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  if (action === 'register') {
    const { referralCode } = body;
    // Validate referral code exists (unless it's the company code)
    if (referralCode && referralCode.toUpperCase() !== 'STITCHMANAGER') {
      const referrer = await getUserByCode(referralCode);
      if (!referrer) {
        return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
      }
    }
    const user = await createUser(email, referralCode || 'STITCHMANAGER');
    return NextResponse.json(user);
  }

  if (action === 'update-bank') {
    const { bankName, accountNumber, accountName, bvn } = body;
    const user = await getUser(email);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    user.bankName = bankName || user.bankName;
    user.accountNumber = accountNumber || user.accountNumber;
    user.accountName = accountName || user.accountName;
    if (bvn) {
      user.bvn = bvn;
      // BVN verification via Paystack
      try {
        const verifyRes = await fetch(`https://api.paystack.co/bank/resolve_bvn/${bvn}`, {
          headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
        });
        if (verifyRes.ok) {
          user.bvnVerified = true;
        } else {
          user.bvnVerified = false;
        }
      } catch {
        user.bvnVerified = false;
      }
    }
    await saveUser(user);
    return NextResponse.json(user);
  }

  if (action === 'add-earning') {
    const { referrerCode, amount } = body;
    await addEarning(referrerCode, amount);
    return NextResponse.json({ success: true });
  }

  if (action === 'withdraw') {
    const { amount } = body;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    const result = await createWithdrawal(email, amount);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
