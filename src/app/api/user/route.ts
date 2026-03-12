import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

const PREFIX = 'users/';

interface ServerUser {
  name: string;
  phone: string;
  email: string;
  pinHash: string;
  referralCode: string;
  createdAt: string;
  updatedAt: string;
}

function userPath(email: string): string {
  return `${PREFIX}${email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_')}.json`;
}

async function getUser(email: string): Promise<ServerUser | null> {
  try {
    const path = userPath(email);
    const { blobs } = await list({ prefix: path });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function saveUser(user: ServerUser): Promise<void> {
  const path = userPath(user.email);
  await put(path, JSON.stringify(user), {
    access: 'public',
    contentType: 'application/json',
    allowOverwrite: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'register') {
      // Save user to server on registration
      const { name, phone, email, pinHash, referralCode } = body;
      if (!email || !pinHash) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const existing = await getUser(email);

      const user: ServerUser = {
        name: name || existing?.name || '',
        phone: phone || existing?.phone || '',
        email: email.toLowerCase(),
        pinHash,
        referralCode: referralCode || existing?.referralCode || '',
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      await saveUser(user);
      return NextResponse.json({ success: true });
    }

    if (action === 'check') {
      // Check if a user exists on the server (for account recovery)
      const { email } = body;
      if (!email) {
        return NextResponse.json({ error: 'Email required' }, { status: 400 });
      }

      const user = await getUser(email);
      if (!user) {
        return NextResponse.json({ exists: false });
      }

      return NextResponse.json({
        exists: true,
        name: user.name,
        phone: user.phone,
      });
    }

    if (action === 'recover') {
      // Recover account after OTP verification — return user data and allow PIN reset
      const { email, pinHash } = body;
      if (!email || !pinHash) {
        return NextResponse.json({ error: 'Email and new PIN required' }, { status: 400 });
      }

      const user = await getUser(email);
      if (!user) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      // Update PIN hash
      user.pinHash = pinHash;
      user.updatedAt = new Date().toISOString();
      await saveUser(user);

      return NextResponse.json({
        success: true,
        name: user.name,
        phone: user.phone,
        email: user.email,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('User API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
