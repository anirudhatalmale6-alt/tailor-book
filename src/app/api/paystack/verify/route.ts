import { NextResponse } from 'next/server';
import { createUser, getUser, addEarning } from '@/lib/referral-store';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get('reference');

  if (!reference) {
    return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const data = await response.json();

    if (data.status && data.data.status === 'success') {
      const plan = data.data.metadata?.plan || 'monthly';
      const email = data.data.customer?.email;
      const amountNaira = data.data.amount / 100;
      const referralCode = data.data.metadata?.referral_code || 'STITCHMANAGER';

      // Register user in RMS if not already registered
      if (email) {
        try {
          const existing = await getUser(email);
          if (!existing) {
            await createUser(email, referralCode);
          }
          // Add 5% earning to the referrer
          const user = existing || await getUser(email);
          if (user) {
            await addEarning(user.referredBy, amountNaira);
          }
        } catch (e) {
          console.error('RMS registration error:', e);
        }
      }

      return NextResponse.json({
        status: 'success',
        plan,
        amount: amountNaira,
        email,
        reference: data.data.reference,
      });
    } else {
      return NextResponse.json({
        status: 'failed',
        message: data.data?.gateway_response || 'Payment verification failed',
      });
    }
  } catch (error) {
    console.error('Paystack verify error:', error);
    return NextResponse.json({ error: 'Verification service unavailable' }, { status: 500 });
  }
}
