import { NextResponse } from 'next/server';
import { createUser, getUser, addEarning, addRegistrationEvent } from '@/lib/referral-store';

export async function POST(req: Request) {
  const { email, paystackEmail } = await req.json();

  // Use paystackEmail if provided (in case user registered with different email in app)
  const lookupEmail = paystackEmail || email;

  if (!lookupEmail) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 });
  }

  const headers = { Authorization: `Bearer ${secretKey}` };

  try {
    // Step 1: Look up customer by email
    const custRes = await fetch(
      `https://api.paystack.co/customer/${encodeURIComponent(lookupEmail)}`,
      { headers }
    );
    const custData = await custRes.json();

    if (!custData.status || !custData.data) {
      return NextResponse.json({
        restored: false,
        message: 'No payment account found for this email.',
      });
    }

    const customerId = custData.data.id;

    // Step 2: List successful transactions for this customer
    const txnRes = await fetch(
      `https://api.paystack.co/transaction?customer=${customerId}&status=success&perPage=10`,
      { headers }
    );
    const txnData = await txnRes.json();

    if (!txnData.status || !txnData.data || txnData.data.length === 0) {
      return NextResponse.json({
        restored: false,
        message: 'No successful payments found for this email.',
      });
    }

    // Find the most recent successful transaction
    const latestTxn = txnData.data[0];
    const plan = latestTxn.metadata?.plan || 'monthly';
    const amountNaira = latestTxn.amount / 100;
    const referralCode = latestTxn.metadata?.referral_code || 'STITCHMANAGER';
    const paidAt = latestTxn.paid_at || latestTxn.created_at;

    // Process RMS registration if not already done
    const existing = await getUser(email);
    if (!existing) {
      await createUser(email, referralCode);
      await addRegistrationEvent(referralCode, email);
      const user = await getUser(email);
      if (user) {
        await addEarning(user.referredBy, amountNaira, email, plan);
      }
    }

    return NextResponse.json({
      restored: true,
      plan,
      amount: amountNaira,
      email,
      paidAt,
      reference: latestTxn.reference,
    });
  } catch (error) {
    console.error('Restore purchase error:', error);
    return NextResponse.json({ error: 'Failed to verify with payment provider' }, { status: 500 });
  }
}
