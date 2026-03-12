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

  // referredBy param allows the client to pass the stored referral code
  const referredByParam = searchParams.get('referredBy');

  // Only return data if user exists in RMS (created after first subscription)
  const user = await getUser(email);
  if (!user) {
    return NextResponse.json({ error: 'Not subscribed yet' }, { status: 404 });
  }
  if (user.referredBy === 'STITCHMANAGER' && referredByParam && referredByParam.toUpperCase() !== 'STITCHMANAGER') {
    // User was auto-created with default — update with the actual referral code
    const referrer = await getUserByCode(referredByParam.toUpperCase());
    if (referrer) {
      user.referredBy = referredByParam.toUpperCase();
      await saveUser(user);
    }
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
    const { bankName, accountNumber, accountName } = body;
    try {
      const user = await getUser(email);
      if (!user) {
        return NextResponse.json({ error: 'User not found. Subscribe first.' }, { status: 404 });
      }

      user.bankName = bankName || user.bankName;
      user.accountNumber = accountNumber || user.accountNumber;
      user.accountName = accountName || user.accountName;
      await saveUser(user);
      return NextResponse.json(user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
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
