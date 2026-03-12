import { NextResponse } from 'next/server';
import { createUser, getUser, addEarning, addRegistrationEvent } from '@/lib/referral-store';

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 });
  }

  try {
    // List transactions for this customer from Paystack
    const response = await fetch(
      `https://api.paystack.co/transaction?customer=${encodeURIComponent(email)}&status=success&perPage=10`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    const result = await response.json();

    if (!result.status || !result.data || result.data.length === 0) {
      return NextResponse.json({
        restored: false,
        message: 'No successful payments found for this email.',
      });
    }

    // Find the most recent successful transaction
    const latestTxn = result.data[0];
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
