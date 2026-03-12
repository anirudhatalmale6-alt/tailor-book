import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createUser, getUser, addEarning, addRegistrationEvent } from '@/lib/referral-store';

async function processSuccessfulPayment(email: string, amountNaira: number, plan: string, referralCode: string) {
  try {
    const existing = await getUser(email);
    if (!existing) {
      await createUser(email, referralCode);
      await addRegistrationEvent(referralCode, email);
    }
    const user = existing || await getUser(email);
    if (user) {
      await addEarning(user.referredBy, amountNaira, email, plan);
    }
  } catch (e) {
    console.error('RMS processing error:', e);
  }
}

export async function POST(req: NextRequest) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  // Verify Paystack signature
  const signature = req.headers.get('x-paystack-signature');
  const body = await req.text();

  if (signature) {
    const hash = createHmac('sha512', secretKey).update(body).digest('hex');
    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  try {
    const event = JSON.parse(body);

    if (event.event === 'charge.success') {
      const data = event.data;
      const email = data.customer?.email;
      const amountNaira = data.amount / 100;
      const plan = data.metadata?.plan || 'monthly';
      const referralCode = data.metadata?.referral_code || 'STITCHMANAGER';

      if (email) {
        await processSuccessfulPayment(email, amountNaira, plan, referralCode);
      }
    }

    // Always return 200 to Paystack
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ received: true });
  }
}
