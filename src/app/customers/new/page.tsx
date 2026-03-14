'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { addCustomer, updateCustomer } from '@/hooks/useCustomers';
import { db } from '@/lib/db';
import { fileToBase64, isContactPickerSupported, pickContact, formatPhoneInternational } from '@/lib/utils';
import { useReadOnlyGuard, useSubscription } from '@/hooks/useSubscription';
import PhotoUpload from '@/components/PhotoUpload';
import { toast } from '@/lib/toast';

const FREE_CLIENT_LIMIT = 20;

export default function NewCustomerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div></div>}>
      <NewCustomerForm />
    </Suspense>
  );
}

function NewCustomerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const presetType = searchParams.get('type');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const canEdit = useReadOnlyGuard();
  const subscription = useSubscription();
  const [clientCount, setClientCount] = useState(0);

  useEffect(() => {
    db.customers.where('contactType').equals('client').count().then(setClientCount);
  }, []);

  const [contactPickerAvailable, setContactPickerAvailable] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    photo: '',
    notes: '',
    stylePreferences: '',
    styleImages: [] as string[],
    contactType: (presetType === 'colleague' ? 'colleague' : 'client') as 'client' | 'colleague',
  });

  useEffect(() => {
    setContactPickerAvailable(isContactPickerSupported());
  }, []);

  useEffect(() => {
    if (editId) {
      db.customers.get(editId).then((customer) => {
        if (customer) {
          setForm({
            name: customer.name,
            phone: customer.phone,
            whatsapp: customer.whatsapp,
            email: customer.email,
            address: customer.address,
            photo: customer.photo,
            notes: customer.notes,
            stylePreferences: customer.stylePreferences,
            styleImages: customer.styleImages || [],
            contactType: customer.contactType || 'client',
          });
        }
      });
    }
  }, [editId]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handlePickContact(targetField: 'phone' | 'whatsapp') {
    const contact = await pickContact();
    if (!contact) return;
    setForm((prev) => {
      const updates: Record<string, string> = { [targetField]: contact.phone };
      // If name is empty and we picked for the phone field, also fill the name
      if (targetField === 'phone' && !prev.name && contact.name) {
        updates.name = contact.name;
      }
      return { ...prev, ...updates };
    });
  }

  async function handleStyleImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const images: string[] = [...form.styleImages];
    for (let i = 0; i < files.length; i++) {
      const base64 = await fileToBase64(files[i]);
      images.push(base64);
    }
    setForm((prev) => ({ ...prev, styleImages: images }));
  }

  function removeStyleImage(index: number) {
    setForm((prev) => ({
      ...prev,
      styleImages: prev.styleImages.filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    if (savingRef.current) return;
    if (!canEdit()) return;
    if (!form.name.trim()) {
      toast('Please enter an account name', 'error');
      return;
    }

    // Free tier limit: 20 clients before subscription required
    if (!editId && form.contactType === 'client' && subscription.status !== 'active') {
      const currentCount = await db.customers.where('contactType').equals('client').count();
      if (currentCount >= FREE_CLIENT_LIMIT) {
        router.push('/subscription');
        return;
      }
    }

    savingRef.current = true;
    setSaving(true);
    try {
      // Auto-convert local numbers to international format before saving
      const dataToSave = {
        ...form,
        phone: form.phone ? formatPhoneInternational(form.phone) : '',
        whatsapp: form.whatsapp ? formatPhoneInternational(form.whatsapp) : '',
      };
      if (editId) {
        await updateCustomer(editId, dataToSave);
        router.back();
      } else {
        const id = await addCustomer(dataToSave);
        router.replace(`/customers/${id}`);
      }
    } catch (err) {
      console.error('Failed to save account:', err);
      toast('Failed to save account. Please try again.', 'error');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-1 text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">
          {editId ? 'Edit Account' : presetType === 'colleague' ? 'Add Colleague' : 'New Account'}
        </h1>
      </div>

      <div className="space-y-4">
        <div className="flex justify-center">
          <PhotoUpload
            value={form.photo}
            onChange={(v) => handleChange('photo', v)}
            className="w-28 h-28"
            placeholder="Add Photo"
          />
        </div>

        {/* Contact Type Selector */}
        <div>
          <label className="block text-sm font-medium text-white mb-1">This person is a...</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, contactType: 'client' }))}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                form.contactType === 'client'
                  ? 'bg-gold-bg border-indigo-300 text-gold-dim'
                  : 'bg-royal-card border-royal-border text-white'
              }`}
            >
              Client
            </button>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, contactType: 'colleague' }))}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                form.contactType === 'colleague'
                  ? 'bg-amber-50 border-amber-300 text-gold'
                  : 'bg-royal-card border-royal-border text-white'
              }`}
            >
              Colleague (Tailor)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="Account holder name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Phone</label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="flex-1 px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Phone number"
            />
            {contactPickerAvailable && (
              <button
                type="button"
                onClick={() => handlePickContact('phone')}
                className="px-3 bg-royal-card rounded-xl border border-royal-border text-white hover:bg-royal-hover active:bg-royal-hover transition-colors flex items-center justify-center"
                title="Pick from contacts"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">WhatsApp</label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => handleChange('whatsapp', e.target.value)}
              className="flex-1 px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="WhatsApp number"
            />
            {contactPickerAvailable && (
              <button
                type="button"
                onClick={() => handlePickContact('whatsapp')}
                className="px-3 bg-royal-card rounded-xl border border-royal-border text-white hover:bg-royal-hover active:bg-royal-hover transition-colors flex items-center justify-center"
                title="Pick from contacts"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="Email address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Address</label>
          <textarea
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold resize-none"
            rows={2}
            placeholder="Address"
          />
        </div>

        {form.contactType !== 'colleague' && (
          <>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Style Preferences</label>
              <textarea
                value={form.stylePreferences}
                onChange={(e) => handleChange('stylePreferences', e.target.value)}
                className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold resize-none"
                rows={2}
                placeholder="e.g., Prefers slim fit, likes French cuffs..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">Style Reference Images</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.styleImages.map((img, i) => (
                  <div key={i} className="relative w-20 h-20">
                    <img src={img} alt={`Style ${i + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removeStyleImage(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-400 text-white rounded-full flex items-center justify-center text-xs"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-royal-hover rounded-lg text-sm text-white cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Images
                <input type="file" accept="image/*" multiple onChange={handleStyleImages} className="hidden" />
              </label>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-white mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold resize-none"
            rows={3}
            placeholder="Additional notes..."
          />
        </div>

        {!editId && form.contactType === 'client' && subscription.status !== 'active' && clientCount >= FREE_CLIENT_LIMIT - 2 && (
          <div className={`rounded-xl p-3 text-xs ${
            clientCount >= FREE_CLIENT_LIMIT
              ? 'bg-red-400/10 border border-red-400/30 text-red-400'
              : 'bg-amber-400/10 border border-amber-400/30 text-amber-400'
          }`}>
            {clientCount >= FREE_CLIENT_LIMIT
              ? `You've reached the free limit of ${FREE_CLIENT_LIMIT} clients. Subscribe to add more.`
              : `${clientCount}/${FREE_CLIENT_LIMIT} free clients used. Subscribe for unlimited.`}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold hover:bg-gold-dim active:bg-gold-dim disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : editId ? 'Update Account' : 'Create Account'}
        </button>
      </div>
    </div>
  );
}
