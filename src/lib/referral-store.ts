import { put, list } from '@vercel/blob';

const PREFIX = 'rms/';

// Company default referral code
export const COMPANY_CODE = 'STITCHMANAGER';

export interface ReferralUser {
  email: string;
  referralCode: string;      // This user's unique code
  referredBy: string;         // Referral code used when subscribing
  totalEarnings: number;      // Total earned from referrals (in Naira)
  withdrawnAmount: number;    // Total withdrawn
  availableBalance: number;   // earnings - withdrawn
  referralCount: number;      // Number of users referred
  referredUsers: string[];    // Emails of referred users
  bankName: string;
  accountNumber: string;
  accountName: string;
  bvn: string;
  bvnVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Withdrawal {
  id: string;
  email: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestedAt: string;
  processedAt?: string;
  reason?: string;
}

function generateCode(email: string): string {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base.substring(0, 6)}${suffix}`;
}

// --- User Operations ---

export async function getUser(email: string): Promise<ReferralUser | null> {
  try {
    const { blobs } = await list({ prefix: `${PREFIX}users/${email}.json` });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch {
    return null;
  }
}

export async function getUserByCode(code: string): Promise<ReferralUser | null> {
  try {
    const { blobs } = await list({ prefix: `${PREFIX}codes/${code.toUpperCase()}.json` });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url);
    const data = await res.json();
    return getUser(data.email);
  } catch {
    return null;
  }
}

export async function createUser(email: string, referredByCode: string): Promise<ReferralUser> {
  const existing = await getUser(email);
  if (existing) return existing;

  const referralCode = generateCode(email);

  const user: ReferralUser = {
    email,
    referralCode,
    referredBy: referredByCode.toUpperCase() || COMPANY_CODE,
    totalEarnings: 0,
    withdrawnAmount: 0,
    availableBalance: 0,
    referralCount: 0,
    referredUsers: [],
    bankName: '',
    accountNumber: '',
    accountName: '',
    bvn: '',
    bvnVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save user data
  await put(`${PREFIX}users/${email}.json`, JSON.stringify(user), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  // Save code → email mapping
  await put(`${PREFIX}codes/${referralCode}.json`, JSON.stringify({ email }), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  // Update the referrer's referred users list
  if (referredByCode && referredByCode.toUpperCase() !== COMPANY_CODE) {
    const referrer = await getUserByCode(referredByCode);
    if (referrer) {
      if (!referrer.referredUsers.includes(email)) {
        referrer.referredUsers.push(email);
        referrer.referralCount = referrer.referredUsers.length;
        referrer.updatedAt = new Date().toISOString();
        await saveUser(referrer);
      }
    }
  }

  return user;
}

export async function saveUser(user: ReferralUser): Promise<void> {
  user.updatedAt = new Date().toISOString();
  await put(`${PREFIX}users/${user.email}.json`, JSON.stringify(user), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
}

export async function addEarning(referrerCode: string, amount: number): Promise<void> {
  if (!referrerCode || referrerCode === COMPANY_CODE) return;

  const referrer = await getUserByCode(referrerCode);
  if (!referrer) return;

  const commission = amount * 0.05; // 5% commission
  referrer.totalEarnings += commission;
  referrer.availableBalance = referrer.totalEarnings - referrer.withdrawnAmount;
  await saveUser(referrer);
}

// --- Withdrawal Operations ---

export async function getWithdrawals(email?: string): Promise<Withdrawal[]> {
  try {
    const prefix = email
      ? `${PREFIX}withdrawals/${email}/`
      : `${PREFIX}withdrawals/`;
    const { blobs } = await list({ prefix });
    const withdrawals: Withdrawal[] = [];
    for (const blob of blobs) {
      const res = await fetch(blob.url);
      withdrawals.push(await res.json());
    }
    return withdrawals.sort((a, b) =>
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function createWithdrawal(email: string, amount: number): Promise<Withdrawal | { error: string }> {
  const user = await getUser(email);
  if (!user) return { error: 'User not found' };
  if (!user.bvnVerified) return { error: 'BVN not verified' };
  if (user.availableBalance < 4320) return { error: 'Minimum withdrawal is ₦4,320' };
  if (amount > user.availableBalance) return { error: 'Insufficient balance' };
  if (!user.accountNumber || !user.bankName) return { error: 'Bank details not set' };

  const id = `WD${Date.now()}`;
  const withdrawal: Withdrawal = {
    id,
    email,
    amount,
    bankName: user.bankName,
    accountNumber: user.accountNumber,
    accountName: user.accountName,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  await put(`${PREFIX}withdrawals/${email}/${id}.json`, JSON.stringify(withdrawal), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  return withdrawal;
}

export async function updateWithdrawal(email: string, id: string, status: 'approved' | 'rejected' | 'paid', reason?: string): Promise<void> {
  const { blobs } = await list({ prefix: `${PREFIX}withdrawals/${email}/${id}.json` });
  if (blobs.length === 0) return;
  const res = await fetch(blobs[0].url);
  const withdrawal: Withdrawal = await res.json();

  withdrawal.status = status;
  withdrawal.processedAt = new Date().toISOString();
  if (reason) withdrawal.reason = reason;

  await put(`${PREFIX}withdrawals/${email}/${id}.json`, JSON.stringify(withdrawal), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  // If paid, update user's withdrawn amount
  if (status === 'paid') {
    const user = await getUser(email);
    if (user) {
      user.withdrawnAmount += withdrawal.amount;
      user.availableBalance = user.totalEarnings - user.withdrawnAmount;
      await saveUser(user);
    }
  }
}

// --- Admin Operations ---

export async function getAllUsers(): Promise<ReferralUser[]> {
  try {
    const { blobs } = await list({ prefix: `${PREFIX}users/` });
    const users: ReferralUser[] = [];
    for (const blob of blobs) {
      const res = await fetch(blob.url);
      users.push(await res.json());
    }
    return users;
  } catch {
    return [];
  }
}

export async function getAllWithdrawals(): Promise<Withdrawal[]> {
  return getWithdrawals();
}
