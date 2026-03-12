import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

const PREFIX = 'users/';

interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  lastActive: string;
  registeredAt: string;
}

interface ServerUser {
  name: string;
  phone: string;
  email: string;
  pinHash: string;
  referralCode: string;
  createdAt: string;
  updatedAt: string;
  devices?: DeviceInfo[];
  maxDevices?: number;
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

    if (action === 'heartbeat') {
      // Register/update device activity
      const { email, pinHash, deviceId, deviceName } = body;
      if (!email || !pinHash || !deviceId) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
      }

      const user = await getUser(email);
      if (!user) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      // Verify PIN
      if (user.pinHash !== pinHash) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const now = new Date().toISOString();
      const devices = user.devices || [];
      const maxDevices = user.maxDevices || 2; // Default: 2 active devices

      // Find existing device
      const existingIdx = devices.findIndex(d => d.deviceId === deviceId);
      if (existingIdx >= 0) {
        // Update last active
        devices[existingIdx].lastActive = now;
        devices[existingIdx].deviceName = deviceName || devices[existingIdx].deviceName;
      } else {
        // New device — check limit
        // Remove devices inactive for 30+ days
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const activeDevices = devices.filter(d => new Date(d.lastActive).getTime() > thirtyDaysAgo);

        if (activeDevices.length >= maxDevices) {
          return NextResponse.json({
            error: 'device_limit',
            message: `Maximum ${maxDevices} active devices allowed. Please remove a device first.`,
            devices: activeDevices.map(d => ({ deviceId: d.deviceId, deviceName: d.deviceName, lastActive: d.lastActive })),
          }, { status: 403 });
        }

        activeDevices.push({
          deviceId,
          deviceName: deviceName || 'Unknown Device',
          lastActive: now,
          registeredAt: now,
        });

        // Replace devices list with only active ones + new device
        user.devices = activeDevices;
      }

      if (existingIdx >= 0) {
        user.devices = devices;
      }
      user.updatedAt = now;
      await saveUser(user);

      return NextResponse.json({
        success: true,
        devices: (user.devices || []).map(d => ({
          deviceId: d.deviceId,
          deviceName: d.deviceName,
          lastActive: d.lastActive,
          isCurrent: d.deviceId === deviceId,
        })),
      });
    }

    if (action === 'remove_device') {
      // Remove a device from the account
      const { email, pinHash, targetDeviceId } = body;
      if (!email || !pinHash || !targetDeviceId) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
      }

      const user = await getUser(email);
      if (!user) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      if (user.pinHash !== pinHash) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      user.devices = (user.devices || []).filter(d => d.deviceId !== targetDeviceId);
      user.updatedAt = new Date().toISOString();
      await saveUser(user);

      return NextResponse.json({ success: true, devices: user.devices });
    }

    if (action === 'get_devices') {
      // Get list of active devices
      const { email, pinHash } = body;
      if (!email || !pinHash) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
      }

      const user = await getUser(email);
      if (!user) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      if (user.pinHash !== pinHash) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      return NextResponse.json({
        devices: (user.devices || []).map(d => ({
          deviceId: d.deviceId,
          deviceName: d.deviceName,
          lastActive: d.lastActive,
        })),
        maxDevices: user.maxDevices || 2,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('User API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
