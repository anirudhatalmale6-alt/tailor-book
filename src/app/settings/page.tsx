'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import {
  useMeasurementFields,
  addMeasurementField,
  updateMeasurementField,
  deleteMeasurementField,
} from '@/hooks/useMeasurements';
import { useBusinessName, useCurrency, useTaxRate, useBusinessPhone, useBusinessAddress, useBusinessLogo, useBackupFrequency, useLastAutoBackup, setSetting } from '@/hooks/useSettings';
import { fileToBase64 } from '@/lib/utils';
import { useReadOnlyGuard } from '@/hooks/useSubscription';
import { db, type MeasurementField } from '@/lib/db';
import { backupToGoogleDrive, restoreFromGoogleDrive, getBackupInfo } from '@/lib/gdrive-backup';
import { useLocalAuth } from '@/hooks/useLocalAuth';
import { useDeviceTracking, type DeviceEntry } from '@/hooks/useDeviceTracking';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { toast, appConfirm } from '@/lib/toast';

export default function SettingsPage() {
  const canEdit = useReadOnlyGuard();
  const { user: localUser, logout } = useLocalAuth();
  const { deviceLimitHit, removeDevice, getDevices } = useDeviceTracking();
  const router = useRouter();
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [showDevices, setShowDevices] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [removingDevice, setRemovingDevice] = useState<string | null>(null);
  const fields = useMeasurementFields();
  const businessName = useBusinessName();
  const currency = useCurrency();
  const taxRate = useTaxRate();
  const businessPhone = useBusinessPhone();
  const businessAddress = useBusinessAddress();
  const businessLogo = useBusinessLogo();
  const backupFrequency = useBackupFrequency();
  const lastAutoBackup = useLastAutoBackup();

  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<MeasurementField | null>(null);
  const [fieldForm, setFieldForm] = useState({
    name: '',
    unit: 'inches' as 'inches' | 'cm',
    category: 'General',
  });
  const [saving, setSaving] = useState(false);
  const [bizName, setBizName] = useState('');
  const [curr, setCurr] = useState('');
  const [tax, setTax] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [bizAddr, setBizAddr] = useState('');
  const [bizLogo, setBizLogo] = useState('');
  const [bizNameInit, setBizNameInit] = useState(false);
  const [currInit, setCurrInit] = useState(false);
  const [taxInit, setTaxInit] = useState(false);
  const [bizPhoneInit, setBizPhoneInit] = useState(false);
  const [bizAddrInit, setBizAddrInit] = useState(false);
  const [bizLogoInit, setBizLogoInit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState('');

  const accessToken = session?.accessToken;

  useEffect(() => {
    if (accessToken) {
      getBackupInfo(accessToken).then((info) => {
        if (info.exists && info.lastModified) {
          setLastBackup(info.lastModified);
        }
      });
    }
  }, [accessToken]);

  async function handleCloudBackup() {
    if (!accessToken) return;
    setBackingUp(true);
    setBackupMessage('');
    const result = await backupToGoogleDrive(accessToken);
    if (result.success) {
      setBackupMessage('Backup successful!');
      setLastBackup(new Date().toISOString());
    } else if (result.error?.toLowerCase().includes('scope') || result.error?.toLowerCase().includes('insufficient')) {
      // Scope error — need to re-link Google account
      setBackupMessage('scope_error');
    } else {
      setBackupMessage(`Backup failed: ${result.error}`);
    }
    setBackingUp(false);
  }

  async function handleCloudRestore() {
    if (!accessToken) return;
    if (!(await appConfirm('This will replace ALL your current data with the cloud backup. Are you sure?', 'Restore'))) return;
    setRestoring(true);
    setBackupMessage('');
    const result = await restoreFromGoogleDrive(accessToken);
    if (result.success) {
      setBackupMessage('Restore successful! Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setBackupMessage(`Restore failed: ${result.error}`);
    }
    setRestoring(false);
  }

  if (businessName && !bizNameInit) {
    setBizName(businessName);
    setBizNameInit(true);
  }
  if (currency && !currInit) {
    setCurr(currency);
    setCurrInit(true);
  }
  if (!taxInit && taxRate !== undefined) {
    setTax(taxRate.toString());
    setTaxInit(true);
  }
  if (businessPhone && !bizPhoneInit) {
    setBizPhone(businessPhone);
    setBizPhoneInit(true);
  }
  if (businessAddress && !bizAddrInit) {
    setBizAddr(businessAddress);
    setBizAddrInit(true);
  }
  if (businessLogo && !bizLogoInit) {
    setBizLogo(businessLogo);
    setBizLogoInit(true);
  }

  function openAddField() {
    setEditingField(null);
    setFieldForm({ name: '', unit: 'inches', category: 'General' });
    setShowFieldModal(true);
  }

  function openEditField(field: MeasurementField) {
    setEditingField(field);
    setFieldForm({ name: field.name, unit: field.unit, category: field.category });
    setShowFieldModal(true);
  }

  async function handleSaveField() {
    if (!fieldForm.name.trim()) {
      toast('Please enter a field name', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingField) {
        await updateMeasurementField(editingField.id, {
          name: fieldForm.name,
          unit: fieldForm.unit,
          category: fieldForm.category,
        });
      } else {
        const maxSort = fields ? Math.max(0, ...fields.map((f) => f.sortOrder)) : 0;
        await addMeasurementField({
          name: fieldForm.name,
          unit: fieldForm.unit,
          category: fieldForm.category,
          sortOrder: maxSort + 1,
        });
      }
      setShowFieldModal(false);
    } catch (err) {
      console.error('Failed to save field:', err);
      toast('Failed to save field', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteField(field: MeasurementField) {
    if (await appConfirm(`Delete "${field.name}" measurement field?`, 'Delete')) {
      await deleteMeasurementField(field.id);
    }
  }

  async function handleMoveField(field: MeasurementField, direction: 'up' | 'down') {
    if (!fields) return;
    const idx = fields.findIndex((f) => f.id === field.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= fields.length) return;
    const other = fields[swapIdx];
    await updateMeasurementField(field.id, { sortOrder: other.sortOrder });
    await updateMeasurementField(other.id, { sortOrder: field.sortOrder });
  }

  async function handleSaveAllBusiness() {
    if (!canEdit()) return;
    await setSetting('businessName', bizName);
    await setSetting('currency', curr);
    const rate = parseFloat(tax) || 0;
    await setSetting('taxRate', rate.toString());
    await setSetting('businessPhone', bizPhone);
    await setSetting('businessAddress', bizAddr);
    toast('Business settings saved', 'success');
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) {
      toast('Logo image must be under 500KB', 'error');
      return;
    }
    const base64 = await fileToBase64(file);
    setBizLogo(base64);
    await setSetting('businessLogo', base64);
  }

  async function handleRemoveLogo() {
    setBizLogo('');
    await setSetting('businessLogo', '');
  }

  async function handleExport() {
    try {
      const data = {
        customers: await db.customers.toArray(),
        measurementFields: await db.measurementFields.toArray(),
        measurements: await db.measurements.toArray(),
        orders: await db.orders.toArray(),
        payments: await db.payments.toArray(),
        expenses: await db.expenses.toArray(),
        invoices: await db.invoices.toArray(),
        settings: await db.settings.toArray(),
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stitchmanager-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      toast('Failed to export data', 'error');
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !data.customers) {
        toast('Invalid backup file', 'error');
        return;
      }
      if (!(await appConfirm('This will replace ALL your current data. Are you sure?', 'Import'))) return;

      await db.customers.clear();
      await db.measurementFields.clear();
      await db.measurements.clear();
      await db.orders.clear();
      await db.payments.clear();
      await db.expenses.clear();
      await db.invoices.clear();
      await db.settings.clear();

      if (data.customers?.length) await db.customers.bulkAdd(data.customers);
      if (data.measurementFields?.length) await db.measurementFields.bulkAdd(data.measurementFields);
      if (data.measurements?.length) await db.measurements.bulkAdd(data.measurements);
      if (data.orders?.length) await db.orders.bulkAdd(data.orders);
      if (data.payments?.length) await db.payments.bulkAdd(data.payments);
      if (data.expenses?.length) await db.expenses.bulkAdd(data.expenses);
      if (data.invoices?.length) await db.invoices.bulkAdd(data.invoices);
      if (data.settings?.length) await db.settings.bulkAdd(data.settings);

      toast('Data imported successfully! The page will reload.', 'success');
      window.location.reload();
    } catch (err) {
      console.error('Import failed:', err);
      toast('Failed to import data. Make sure the file is a valid Stitch Manager backup.', 'error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const categories = fields
    ? Array.from(new Set(fields.map((f) => f.category)))
    : ['Upper Body', 'Lower Body', 'General'];

  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-bold text-white mb-4">Settings</h1>

      {/* Subscription & Referral */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <a
          href="/subscription"
          className="bg-gradient-to-br from-gold-dim/20 to-gold/10 rounded-xl p-4 border border-gold/20 text-center"
        >
          <svg className="w-6 h-6 text-gold mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <p className="text-sm font-semibold text-gold">Premium</p>
          <p className="text-[10px] text-white/40">Upgrade your plan</p>
        </a>
        <a
          href="/referral"
          className="bg-royal-card rounded-xl p-4 border border-royal-border text-center"
        >
          <svg className="w-6 h-6 text-white mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <p className="text-sm font-semibold text-white">Referrals</p>
          <p className="text-[10px] text-white/40">Earn 5% forever</p>
        </a>
      </div>

      {/* Business Profile Preview */}
      {(businessName || businessPhone || businessAddress || businessLogo) && (
        <div className="bg-gradient-to-r from-gold-dim to-gold rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            {businessLogo && (
              <img src={businessLogo} alt="Logo" className="w-14 h-14 rounded-lg object-contain bg-white/20 p-1 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">{businessName || 'Your Business'}</h3>
              {businessPhone && <p className="text-white/80 text-xs">{businessPhone}</p>}
              {businessAddress && <p className="text-white/80 text-xs">{businessAddress}</p>}
              {currency && <p className="text-white/60 text-[10px] mt-1">Currency: {currency} | Tax: {taxRate}%</p>}
            </div>
          </div>
          <p className="text-white/50 text-[10px] mt-2 text-center">This is how your business appears on invoices</p>
        </div>
      )}

      {/* Business Settings */}
      <div className="bg-royal-card rounded-xl shadow-none p-4 mb-4">
        <h2 className="text-sm font-semibold text-white mb-3">Business</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white mb-1">Business Name</label>
            <input
              type="text"
              value={bizName}
              onChange={(e) => setBizName(e.target.value)}
              className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Your business name"
            />
          </div>
          <div>
            <label className="block text-xs text-white mb-1">Business Phone</label>
            <input
              type="tel"
              value={bizPhone}
              onChange={(e) => setBizPhone(e.target.value)}
              className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="e.g., +234 801 234 5678"
            />
          </div>
          <div>
            <label className="block text-xs text-white mb-1">Business Address</label>
            <input
              type="text"
              value={bizAddr}
              onChange={(e) => setBizAddr(e.target.value)}
              className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="e.g., 12 Broad St, Lagos"
            />
          </div>
          <div>
            <label className="block text-xs text-white mb-1">Business Logo</label>
            {bizLogo ? (
              <div className="flex items-center gap-3">
                <img src={bizLogo} alt="Logo" className="w-16 h-16 rounded-lg object-contain bg-white/10 p-1" />
                <div className="flex gap-2">
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="px-3 py-2 bg-royal-hover text-white rounded-lg text-xs font-medium"
                  >
                    Change
                  </button>
                  <button
                    onClick={handleRemoveLogo}
                    className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => logoInputRef.current?.click()}
                className="w-full py-3 bg-royal-bg border border-dashed border-royal-border rounded-lg text-white/60 text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upload Logo (max 500KB)
              </button>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
          <div>
            <label className="block text-xs text-white mb-1">Default Currency</label>
            <select
              value={curr}
              onChange={(e) => setCurr(e.target.value)}
              className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            >
              <option value="NGN">NGN - Nigerian Naira</option>
              <option value="USD">USD - US Dollar</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GHS">GHS - Ghanaian Cedi</option>
              <option value="KES">KES - Kenyan Shilling</option>
              <option value="ZAR">ZAR - South African Rand</option>
              <option value="XOF">XOF - CFA Franc</option>
              <option value="INR">INR - Indian Rupee</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white mb-1">Tax Rate (%)</label>
            <input
              type="number"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="0"
              min="0"
              max="100"
              step="0.1"
            />
            <p className="text-[10px] text-white/60 mt-1">Applied to invoices. Set to 0 for no tax.</p>
          </div>
          <button
            onClick={handleSaveAllBusiness}
            className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold text-sm mt-2"
          >
            Save Business Settings
          </button>
        </div>
      </div>

      {/* Measurement Fields Manager */}
      <div className="bg-royal-card rounded-xl shadow-none p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Measurement Fields</h2>
          <button
            onClick={openAddField}
            className="px-3 py-1.5 bg-gradient-to-r from-gold-dim to-gold text-white rounded-lg text-xs font-medium hover:bg-gold-dim"
          >
            + Add Field
          </button>
        </div>

        {fields === undefined ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="flex items-center gap-2 bg-royal-bg rounded-lg px-3 py-2"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMoveField(field, 'up')}
                    disabled={idx === 0}
                    className="text-white/60 hover:text-white disabled:opacity-30"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMoveField(field, 'down')}
                    disabled={idx === fields.length - 1}
                    className="text-white/60 hover:text-white disabled:opacity-30"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{field.name}</p>
                  <p className="text-[10px] text-white/60">{field.category} - {field.unit}</p>
                </div>
                <button
                  onClick={() => openEditField(field)}
                  className="p-1 text-white/60 hover:text-gold"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteField(field)}
                  className="p-1 text-white/60 hover:text-red-400"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account */}
      <div className="bg-royal-card rounded-xl shadow-none p-4 mb-4">
        <h2 className="text-sm font-semibold text-white mb-3">Account</h2>
        {localUser ? (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-dim to-gold flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">{localUser.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{localUser.name}</p>
                <p className="text-xs text-white/60 truncate">{localUser.email}</p>
                <p className="text-[10px] text-white/40 truncate">{localUser.phone}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); router.replace('/login'); }}
              className="w-full py-2 bg-royal-hover text-white/60 rounded-xl text-sm font-medium"
            >
              Log Out
            </button>

            {/* Active Devices */}
            <div className="mt-3 pt-3 border-t border-royal-border">
              <button
                onClick={async () => {
                  if (showDevices) {
                    setShowDevices(false);
                    return;
                  }
                  setLoadingDevices(true);
                  const devs = await getDevices();
                  setDevices(devs);
                  setShowDevices(true);
                  setLoadingDevices(false);
                }}
                className="w-full flex items-center justify-between py-2"
              >
                <span className="text-xs text-white/60 font-medium">Active Devices</span>
                {loadingDevices ? (
                  <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className={`w-4 h-4 text-white/40 transition-transform ${showDevices ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {deviceLimitHit && !showDevices && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 mt-1">
                  <p className="text-[10px] text-red-400">Device limit reached. Tap &quot;Active Devices&quot; to manage your devices.</p>
                </div>
              )}

              {showDevices && (
                <div className="space-y-2 mt-2">
                  {devices.length === 0 ? (
                    <p className="text-[10px] text-white/40 text-center py-2">No devices registered yet</p>
                  ) : (
                    devices.map((d) => (
                      <div key={d.deviceId} className="flex items-center gap-2 bg-royal-bg rounded-lg px-3 py-2">
                        <svg className="w-5 h-5 text-white/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {d.deviceName}
                            {d.isCurrent && (
                              <span className="ml-1.5 text-[10px] text-green-400 font-normal">(This device)</span>
                            )}
                          </p>
                          <p className="text-[10px] text-white/40">
                            Last active: {new Date(d.lastActive).toLocaleDateString()}
                          </p>
                        </div>
                        {!d.isCurrent && (
                          <button
                            onClick={async () => {
                              if (!(await appConfirm(`Remove "${d.deviceName}" from your account?`, 'Remove'))) return;
                              setRemovingDevice(d.deviceId);
                              await removeDevice(d.deviceId);
                              const devs = await getDevices();
                              setDevices(devs);
                              setRemovingDevice(null);
                            }}
                            disabled={removingDevice === d.deviceId}
                            className="p-1.5 text-red-400/60 hover:text-red-400 disabled:opacity-50"
                          >
                            {removingDevice === d.deviceId ? (
                              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                  <p className="text-[10px] text-white/40 text-center">Max 2 active devices per account</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/60">Not logged in</p>
        )}
      </div>

      {/* Cloud Backup (Google Drive) */}
      <div className="bg-royal-card rounded-xl shadow-none p-4 mb-4">
        <h2 className="text-sm font-semibold text-white mb-3">Cloud Backup</h2>
        {session?.user ? (
          <>
            <p className="text-xs text-white/60 mb-3">
              Linked to <span className="text-white">{session.user.email}</span> for Google Drive backup.
            </p>
            {/* Auto Backup Schedule */}
            <div className="mb-3">
              <label className="block text-xs text-white mb-1.5">Auto Backup Schedule</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { value: 'off', label: 'Off' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSetting('backupFrequency', opt.value)}
                    className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                      backupFrequency === opt.value
                        ? 'bg-gradient-to-r from-gold-dim to-gold text-white'
                        : 'bg-royal-bg text-white/60 border border-royal-border'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {backupFrequency !== 'off' && (
                <p className="text-[10px] text-white/40 mt-1">
                  Auto backup runs {backupFrequency} when you open the app.
                  {lastAutoBackup && ` Last auto backup: ${new Date(lastAutoBackup).toLocaleString()}`}
                </p>
              )}
            </div>
            {lastBackup && (
              <p className="text-xs text-white/40 mb-3">
                Last manual backup: {new Date(lastBackup).toLocaleString()}
              </p>
            )}
            {backupMessage === 'scope_error' ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                <p className="text-xs text-red-400 font-medium mb-2">Google Drive permission missing</p>
                <p className="text-[10px] text-white/60 mb-2">
                  Your Google account needs to be re-linked to enable backup. This usually happens after app permissions are updated.
                </p>
                <button
                  onClick={async () => {
                    await signOut({ redirect: false });
                    setBackupMessage('');
                    setTimeout(() => {
                      signIn('google', { callbackUrl: '/settings' });
                    }, 500);
                  }}
                  className="w-full py-2 bg-gradient-to-r from-gold-dim to-gold text-white rounded-lg text-xs font-medium"
                >
                  Re-link Google Account
                </button>
              </div>
            ) : backupMessage && (
              <p className={`text-xs mb-3 ${backupMessage.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>
                {backupMessage}
              </p>
            )}
            <div className="space-y-2">
              <button
                onClick={handleCloudBackup}
                disabled={backingUp}
                className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {backingUp ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Backing up...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Backup to Google Drive
                  </>
                )}
              </button>
              <button
                onClick={handleCloudRestore}
                disabled={restoring}
                className="w-full py-3 bg-royal-hover text-white rounded-xl font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {restoring ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Restore from Google Drive
                  </>
                )}
              </button>
              <button
                onClick={() => signOut()}
                className="w-full py-2 bg-royal-hover text-white/40 rounded-xl text-xs font-medium"
              >
                Unlink Google Account
              </button>
            </div>
          </>
        ) : (
          <div>
            <p className="text-xs text-white/60 mb-3">
              Link your Google account to enable automatic cloud backup to Google Drive.
            </p>
            <button
              onClick={() => signIn('google', { callbackUrl: '/settings' })}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white rounded-xl text-gray-800 font-medium text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Link Google Account
            </button>
          </div>
        )}
      </div>

      {/* Data Management */}
      <div className="bg-royal-card rounded-xl shadow-none p-4 mb-4">
        <h2 className="text-sm font-semibold text-white mb-3">Local Data</h2>
        <div className="space-y-2">
          <button
            onClick={handleExport}
            className="w-full py-3 bg-royal-hover text-white rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Data (JSON)
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-royal-hover text-white rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Data (JSON)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      {/* Admin Panel (visible to admin only) */}
      {localUser?.email === 'pgmclement@gmail.com' && (
        <div className="bg-royal-card rounded-xl shadow-none p-4 mb-4">
          <h2 className="text-sm font-semibold text-white mb-3">Admin</h2>
          <a
            href="/admin/referrals"
            className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Manage Referrals (RMS)
          </a>
        </div>
      )}

      {/* Help & Support */}
      <div className="bg-royal-card rounded-xl shadow-none p-4 mb-4">
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Help & Support
        </h2>

        {/* Contact */}
        <div className="space-y-2 mb-4">
          <a
            href="mailto:support@stitchmanager.online"
            className="flex items-center gap-3 bg-royal-bg rounded-lg px-3 py-2.5"
          >
            <svg className="w-5 h-5 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Email Support</p>
              <p className="text-xs text-white/50">support@stitchmanager.online</p>
            </div>
          </a>
          <a
            href="https://wa.me/message/stitchmanager"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-royal-bg rounded-lg px-3 py-2.5"
          >
            <svg className="w-5 h-5 text-green-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">WhatsApp</p>
              <p className="text-xs text-white/50">Chat with us</p>
            </div>
          </a>
        </div>

        {/* Social Media */}
        <p className="text-xs text-white/40 uppercase font-medium mb-2">Follow Us</p>
        <div className="flex gap-3 mb-4">
          <a href="https://instagram.com/stitchmanager" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-royal-bg rounded-full flex items-center justify-center hover:bg-royal-hover transition-colors">
            <svg className="w-5 h-5 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </a>
          <a href="https://facebook.com/stitchmanager" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-royal-bg rounded-full flex items-center justify-center hover:bg-royal-hover transition-colors">
            <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
          <a href="https://twitter.com/stitchmanager" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-royal-bg rounded-full flex items-center justify-center hover:bg-royal-hover transition-colors">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a href="https://tiktok.com/@stitchmanager" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-royal-bg rounded-full flex items-center justify-center hover:bg-royal-hover transition-colors">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
            </svg>
          </a>
        </div>

        {/* FAQ */}
        <p className="text-xs text-white/40 uppercase font-medium mb-2">FAQ</p>
        <div className="space-y-2">
          {[
            { q: 'Is my data safe?', a: 'Yes! All data is stored locally on your device. You can also back up to Google Drive for extra safety.' },
            { q: 'Can I use it offline?', a: 'Absolutely! Stitch Manager works fully offline. Internet is only needed for cloud backup and payments.' },
            { q: 'How do referrals work?', a: 'Share your referral code with other tailors. When they subscribe, you earn 5% of every payment they make — permanently!' },
            { q: 'How do I cancel my subscription?', a: 'Subscriptions are not auto-renewed. Simply don\'t pay when it expires. Your data remains on your device.' },
          ].map((faq, i) => (
            <details key={i} className="bg-royal-bg rounded-lg group">
              <summary className="px-3 py-2.5 text-sm font-medium text-white cursor-pointer list-none flex items-center justify-between">
                {faq.q}
                <svg className="w-4 h-4 text-white/40 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="px-3 pb-2.5 text-xs text-white/60">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* App Info */}
      <div className="text-center py-4">
        <p className="text-xs text-white/60">Stitch Manager v1.0</p>
        <p className="text-xs text-white/60">All data stored locally on your device</p>
        <p className="text-[10px] text-white/30 mt-1">TECKMAKE</p>
      </div>

      {/* Measurement Field Modal */}
      <Modal
        isOpen={showFieldModal}
        onClose={() => setShowFieldModal(false)}
        title={editingField ? 'Edit Measurement Field' : 'Add Measurement Field'}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Field Name *</label>
            <input
              type="text"
              value={fieldForm.name}
              onChange={(e) => setFieldForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-3 bg-royal-bg rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="e.g., Thigh, Wrist..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Unit</label>
            <div className="flex gap-2">
              {(['inches', 'cm'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setFieldForm((p) => ({ ...p, unit: u }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    fieldForm.unit === u
                      ? 'bg-gradient-to-r from-gold-dim to-gold text-white'
                      : 'bg-royal-hover text-white'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Category</label>
            <select
              value={fieldForm.category}
              onChange={(e) => setFieldForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full px-4 py-3 bg-royal-bg rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="Upper Body">Upper Body</option>
              <option value="Lower Body">Lower Body</option>
              <option value="General">General</option>
            </select>
          </div>
          <button
            onClick={handleSaveField}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold hover:bg-gold-dim disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : editingField ? 'Update Field' : 'Add Field'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
