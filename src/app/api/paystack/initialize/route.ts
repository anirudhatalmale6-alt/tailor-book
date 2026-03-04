import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { email, amount, plan, referralCode } = await req.json();

  if (!email || !amount || !plan) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 });
  }

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount, // Already in kobo
        callback_url: `${process.env.NEXTAUTH_URL || process.env.AUTH_URL}/subscription/verify`,
        metadata: {
          plan,
          referral_code: (referralCode || 'STITCHMANAGER').toUpperCase(),
          custom_fields: [
            {
              display_name: 'Plan',
              variable_name: 'plan',
              value: plan,
            },
            {
              display_name: 'Referral Code',
              variable_name: 'referral_code',
              value: referralCode || 'STITCHMANAGER',
            },
          ],
        },
      }),
    });

    const data = await response.json();

    if (data.status) {
      return NextResponse.json({
        authorization_url: data.data.authorization_url,
        reference: data.data.reference,
      });
    } else {
      return NextResponse.json({ error: data.message || 'Payment initialization failed' }, { status: 400 });
    }
  } catch (error) {
    console.error('Paystack error:', error);
    return NextResponse.json({ error: 'Payment service unavailable' }, { status: 500 });
  }
}
