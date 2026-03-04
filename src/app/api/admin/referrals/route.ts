import { NextResponse } from 'next/server';
import { getAllUsers, getAllWithdrawals, updateWithdrawal, getUser, saveUser } from '@/lib/referral-store';

const ADMIN_EMAIL = 'pgmclement@gmail.com';

function isAdmin(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}

// GET /api/admin/referrals — Get all users and withdrawals
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('admin_email');

  if (!isAdmin(email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const [users, withdrawals] = await Promise.all([
    getAllUsers(),
    getAllWithdrawals(),
  ]);

  return NextResponse.json({ users, withdrawals });
}

// POST /api/admin/referrals — Admin actions on referrals
export async function POST(req: Request) {
  const body = await req.json();
  const { admin_email, action } = body;

  if (!isAdmin(admin_email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (action === 'process-withdrawal') {
    const { email, withdrawalId, status, reason } = body;
    if (!email || !withdrawalId || !status) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    await updateWithdrawal(email, withdrawalId, status, reason);
    return NextResponse.json({ success: true });
  }

  if (action === 'update-referral-code') {
    // Admin override to change a user's referredBy code
    const { email, newReferredBy } = body;
    if (!email || !newReferredBy) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const user = await getUser(email);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    user.referredBy = newReferredBy.toUpperCase();
    await saveUser(user);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
