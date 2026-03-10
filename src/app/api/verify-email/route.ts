import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Use a signed approach: encrypt OTP in a token so no server-side storage needed
const SECRET = process.env.AUTH_SECRET || 'stitch-manager-secret';

async function hmacSign(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, otp, token } = body;

    if (action === 'send') {
      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
      const payload = `${email}:${code}:${expires}`;
      const signature = await hmacSign(payload);
      const verifyToken = Buffer.from(JSON.stringify({ email, code, expires, sig: signature })).toString('base64');

      // Send email via Resend
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
      }

      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: 'Stitch Manager <noreply@sendmails.stitchmanager.online>',
        to: email,
        subject: 'Your Stitch Manager Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1028; text-align: center;">Stitch Manager</h2>
            <p style="color: #333; text-align: center;">Your verification code is:</p>
            <div style="background: #1a1028; color: #e8c547; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 12px; letter-spacing: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #666; text-align: center; font-size: 14px;">This code expires in 10 minutes.</p>
            <p style="color: #999; text-align: center; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });

      return NextResponse.json({ success: true, token: verifyToken });
    }

    if (action === 'verify') {
      // Verify the OTP against the token
      if (!token || !otp) {
        return NextResponse.json({ error: 'Missing verification data' }, { status: 400 });
      }

      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        const { email: tokenEmail, code, expires, sig } = decoded;

        // Check expiration
        if (Date.now() > expires) {
          return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 });
        }

        // Verify signature
        const payload = `${tokenEmail}:${code}:${expires}`;
        const expectedSig = await hmacSign(payload);
        if (sig !== expectedSig) {
          return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 });
        }

        // Check OTP matches
        if (otp !== code) {
          return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 });
        }

        return NextResponse.json({ success: true, verified: true });
      } catch {
        return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
