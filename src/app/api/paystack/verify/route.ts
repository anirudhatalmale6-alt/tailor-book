import { NextResponse } from 'next/server';

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
      return NextResponse.json({
        status: 'success',
        plan,
        amount: data.data.amount / 100, // Convert from kobo to naira
        email: data.data.customer?.email,
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
